# Final Plan — Pretix Customer Account Linking + Pretix-Side Filtering

Created: 2026-07-04
Status: supersedes the "user order history via email scan" idea in
`plan/final_pretix_formbricks_phase_2_user_order_history` for the personal-data path.
Reason: the `customer=` Pretix filter is now docs-verified, which enables Pretix-side filtering
(the user's hard constraint) instead of backend scan-and-filter.

---

## What the user asked (re-derived)

1. Direct Google-OAuth-token -> Pretix is impossible. Accepted.
2. Do a ONE-TIME account link, then STORE the data in our database.
3. To see historical/personal data, a user MUST link their Pretix customer account to the website.
4. HARD CONSTRAINT: do NOT filter on the backend by scanning everything. Use Pretix's OWN filtering.
5. User believes Pretix supports this account-linking auth flow — substantially correct (see below),
   but the mechanism is identity linkage + organizer-token calls using Pretix filters, NOT a customer
   bearer token handed to us.

---

## Docs-VERIFIED Pretix facts (the crux)

1. Order positions support a `customer` filter — THE key enabler:
   `GET /api/v1/organizers/{organizer}/events/{event}/orderpositions/?customer={identifier}`
   Docs: `customer (string) - Only show orders linked to the given customer.`
   => Pretix does the filtering; we pass the identifier and get back only that customer's positions.
   Same endpoint also exposes `has_checkin`, `order__status__in`, `subevent`, `item__in`.

2. Organizer-wide order positions include `event` in each result:
   `GET /api/v1/organizers/{organizer}/orderpositions/` (get a customer's positions across all events
   in one paginated call — CONFIRM `customer` is honored at organizer scope on the live instance;
   event-scoped is the guaranteed fallback).

3. Customers lookup by email:
   `GET /api/v1/organizers/{organizer}/customers/?email={email}`
   Returns `identifier` (stable id) and `external_identifier` (SSO subject if provisioned via an
   external identity provider) and `is_verified`.

4. Pretix REST auth is `Authorization: Token <organizer/team API token>`. Google tokens not accepted.

### Honesty flags (verify on the real instance; do not assume)
- `customer` filter is docs-verified on EVENT-scoped orderpositions. Confirm organizer-scoped
  orderpositions and plain `orders/` honor it too; else loop events (still Pretix-side filtering).
- Pretix customer-account SSO populating `external_identifier` is strongly implied but the exact
  organizer config must be confirmed on this deployment. Do not claim it works until tested.
- `get_or_create_for_backend` / `process_login` docs are for pretix CONTROL-PANEL staff users,
  NOT customer accounts. Do not cite as customer-SSO evidence.

---

## Reconciling "store in DB" WITH "use Pretix filtering"

Separate ingest-time from read-time:
- INGEST/SYNC: call Pretix WITH `customer={identifier}`; Pretix returns only that customer's records.
  We never fetch-all-and-filter-in-Rust.
- STORAGE: persist only the already-filtered, sanitized subset for that linked customer.
- READ: the website reads history from our DB (fast, resilient to Pretix downtime).
Pretix's filtering selects the data; our DB is just a cache of that filtered result.

---

## Linking approaches (priority order)

### Path A — Native Pretix customer-account SSO (best; matches user's mental model)
Configure organizer customer accounts to authenticate via SSO using the SAME Google identity the
website uses; each Pretix customer's `external_identifier` then corresponds to the Google `sub`.
Link step:
1. User signs in on the website with Google (backend already validates ID token + `email_verified`).
2. Backend finds the Pretix customer by `external_identifier == google_sub` (preferred) or verified
   email fallback.
3. Store the mapping.
Requires instance configuration + a discovery spike to confirm how `external_identifier` is set.

### Path B — Verified-email linking (pragmatic MVP; no Pretix reconfig)
1. User signs in with Google; backend has verified email.
2. `POST /api/pretix/me/link` -> backend calls
   `GET /api/v1/organizers/{organizer}/customers/?email={verified_google_email}` with org token.
3. Resolve: exactly 1 -> link; 0 -> tell user to create/sign in to Pretix with the same Google email;
   >1 -> do not auto-link, require manual/admin resolution.
4. Store `pretix_customer_identifier`.

Both paths converge on the SAME data path: `customer={identifier}` Pretix-side filtering.

---

## Data model (our DB)

```sql
create table pretix_account_links (
  id text primary key,
  google_sub text not null,
  google_email text not null,
  organizer_slug text not null,
  pretix_customer_identifier text not null,
  pretix_customer_email text,
  pretix_external_identifier text,
  verified_method text not null,      -- 'sso_external_identifier' | 'verified_email_match' | 'manual'
  status text not null default 'active',
  linked_at text not null,
  last_synced_at text,
  revoked_at text,
  unique (google_sub, organizer_slug),
  unique (organizer_slug, pretix_customer_identifier)
);

create table pretix_order_history_cache (
  id text primary key,
  link_id text not null references pretix_account_links(id),
  organizer_slug text not null,
  event_slug text not null,
  event_name text,
  order_code text not null,
  status text not null,               -- pending/paid/canceled/expired
  order_datetime text,
  total text,
  currency text,
  attendee_count integer not null default 0,
  checked_in_count integer,
  last_synced_at text not null,
  unique (link_id, organizer_slug, event_slug, order_code)
);
```

Store only sanitized summary fields. Do NOT store ticket `secret`/`web_secret`, download URLs, or raw
payloads. Treat stored email/name as PII.

---

## Backend endpoints (all require `Authorization: Bearer <google_id_token>`)

```http
GET    /api/pretix/me/link        -> { linked: bool, customer_summary? }
POST   /api/pretix/me/link        -> runs Path A/B linking, stores identifier
DELETE /api/pretix/me/link        -> revoke link (+ optionally purge cached history)
POST   /api/pretix/me/orders/sync -> pull via customer= filter, upsert cache
GET    /api/pretix/me/orders      -> read sanitized cache for the active link
```

Sync (ONLY place Pretix is queried for personal data):
```
identifier = active link.pretix_customer_identifier   // NEVER from the client
GET {PRETIX_API_BASE_URL}/api/v1/organizers/{org}/orderpositions/?customer={identifier}
Authorization: Token <PRETIX_API_TOKEN>
// or loop configured events with event-scoped orderpositions if organizer-scope ignores customer
// aggregate positions -> per-order summaries -> upsert into pretix_order_history_cache
```

---

## Security rules

- The customer identifier for any Pretix call MUST come from a stored, completed link keyed by the
  validated Google `sub` — NEVER a client-supplied param/body (prevents user A reading user B).
- Backend Pretix calls use a READ-ONLY organizer API token; never a Google token.
- Reuse the existing frontend 401 -> signOut() self-healing pattern.
- CORS: personal-data endpoints must not use wildcard `*` (see phase_0 security fixes).
- Logging: counts/status only; no raw orders, tokens, keys, or PII bodies.

---

## Discovery spike REQUIRED before build (small, decisive)

On the real instance with a test customer created like real users:
1. Confirm how `external_identifier` is populated (is website/Google the SSO source?) -> Path A vs B.
2. Confirm `customers/?email=` returns the expected single customer for a Google email.
3. Confirm `orderpositions/?customer={identifier}` returns only that customer's positions
   (event-scoped for sure; test organizer-scoped).
4. Record which order statuses count as historical (paid/pending/canceled).

Exit: know (a) which linking path is available, (b) Pretix-side `customer=` filtering works,
(c) exact endpoint(s) to sync from.

---

## Why this matches every requirement

- One-time link stored in DB: yes (`pretix_account_links`).
- Historical data stored in DB: yes (`pretix_order_history_cache`).
- Access gated by linking a Pretix customer account: yes (no link -> no personal data).
- Filtering done by Pretix, not backend: yes — every pull passes `customer={identifier}`; we never
  scan-and-filter in app code.
- "Pretix supports that auth flow": substantially yes via customer accounts + `external_identifier`
  (Path A) or verified-email match (Path B) — flagged for instance verification.
