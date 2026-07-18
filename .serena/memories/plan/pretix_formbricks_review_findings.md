# Independent Review — Pretix + Order History + Formbricks Admin Plan

Created: 2026-07-04
Reviewer role: independent second-pass review of `plan/pretix_formbricks_*` memories.
Method: verified against real Pretix/Formbricks docs (Context7) AND the actual `jakarta-backend` + `jakarta-website` source. The first-pass author's Pretix doc fetches errored (`TypeError: fetch failed`), so its Pretix specifics were unverified general knowledge. This review verifies, corrects, and reduces scope where the code already solves things.

Read this ALONGSIDE the existing phase memories. It does not replace them; it patches them. Finalizer should fold these into the phase docs.

---

## A. STALE ASSUMPTION — Backend Google JWT validation is ALREADY DONE

The phase 2/3 memories repeatedly list "JWT validation not yet implemented" as an open risk / decision gate / exit criterion. THIS IS OUTDATED.

Evidence:
- `jakarta-backend/src/auth/google.rs`:
  - `validate_google_id_token()` fetches Google JWKS (`https://www.googleapis.com/oauth2/v3/certs`), enforces RS256, `set_audience(google_client_id)`, `set_issuer(accounts.google.com)`, required claims `exp/sub/iss/aud`, 60s leeway, and rejects `email_verified == false`.
  - `extract_user()` accepts `Authorization: Bearer <token>` in production; `X-Debug-User-Email` only when `enable_debug_auth`.
- `jakarta-backend/wrangler.toml`: `GOOGLE_CLIENT_ID` is set, `ENABLE_DEBUG_AUTH="false"`.
- Confirmed by memory `fix_completed/cors_error_handling_and_jwt_sso`.

Impact: Phase 2 and Phase 3 do NOT need to build or wait on auth. The authenticated boundary (browser Google ID token -> backend validates -> AuthUser.email) already exists and is production-grade. Remove the "JWT TBD" risk everywhere. The frontend `src/lib/api.ts` already attaches the Bearer token. This significantly reduces Phase 2/3 scope.

---

## B. PRETIX EVENT STATS — much cheaper than the stored plan (VERIFIED via docs)

Stored Phase 1 says "count order positions, not raw orders" and Phase 4 worries about paginating all orders. Verified docs show a far simpler path.

Endpoint (VERIFIED): `GET /api/v1/organizers/{org}/events/{event}/checkinlists/{list}/positions/`
- Returns a top-level `count` integer (total matching positions) plus paginated `results`.
- Supports query filters: `has_checkin=true|false`, `order__status__in`, `subevent`, `item__in`, `ignore_status`.
- By default it only includes positions belonging to valid orders (status filtering built in), and the check-in list itself already scopes to its configured products/subevent.

Recommended counting (2 cheap calls, read only `count`, use `page_size=1`):
- registered_count = positions count with default status filter (valid orders on that list).
- checked_in_count = same endpoint + `has_checkin=true`.
- attendance_rate = checked_in / registered (null if registered == 0).

Why this is better: no full pagination, no per-order detail calls, and attendance semantics come "for free" from the authoritative check-in list (which already encodes product/subevent scope). The stored plan's `pretixTrackedItemIds` frontmatter becomes optional — prefer configuring the correct check-in list instead of tracking item IDs manually.

Optional one-call optimization to VERIFY on the live instance: the check-in list detail `GET .../checkinlists/{id}/` returns `position_count` and `checkin_count` in many pretix versions. If present, that is a single request. Fall back to the positions `count` method if absent.

Phase 0 change: replace "does orders API expose positions / must we paginate" with "confirm checkinlists/{id}/positions/ returns `count` and honors `has_checkin` on our instance" (near-certain) and "does checkinlists/{id}/ detail expose position_count/checkin_count".

---

## C. AUTH IDEA #3 (Google token -> Pretix) — definitively NOT possible; and #2 (customer OAuth) is a category error

User asked us to read the docs on sharing the Google SSO token with Pretix. Findings:

1. Google token direct to Pretix REST: impossible. Pretix REST auth is `Authorization: Token <team-token>`, or `Bearer <pretix-oauth-access-token>` issued by pretix's OWN oauth server, or device tokens. A Google ID token (`aud=<google client id>`, `iss=accounts.google.com`, signed by Google) has no trust path into pretix. No federation/token-exchange exists. Keep the Phase 0 "POC" only as a 5-minute confirming curl, NOT a decision gate — the answer is known.

2. Pretix OAuth ("Connect with pretix", `GET /api/v1/oauth/authorize?...scope=read write profile`) is for pretix BACKEND users/teams (organizer staff), granting management access to organizer/event data. It is NOT the customer-account (ticket-buyer) portal. The `profile` scope returns the pretix staff user profile, not a buyer's order history.
   => Therefore the stored Phase 2B "use Pretix OAuth for customer-account order delegation" is a category error and is very likely NOT implementable as written. Customer accounts (`/api/v1/organizers/{org}/customers/`) are a separate concept with NO documented per-customer bearer-token API. The customer portal itself is session/cookie based.

Conclusion (strengthens stored recommendation): the ONLY viable design for user order history is backend-mediated with the organizer API key + verified-email matching. Drop/flag Phase 2B as "not supported by Pretix API" rather than "evaluate later".

---

## D. USER ORDER HISTORY — concrete, verified matching strategy

Verified endpoints:
- `GET /api/v1/organizers/{org}/customers/?email={email}` — exact email filter, returns customer `identifier`, `is_verified`, etc.
- `GET /api/v1/organizers/{org}/orders/` and `GET .../events/{event}/orders/` — order lists; order objects carry `email` and (when linked) a `customer` reference. Positions carry `attendee_email`.

Recommended lookup order (all server-side, key held by backend):
1. Primary: look up customer by verified Google email -> get `identifier` -> list that customer's orders. This matches the user's mental model best, because customer accounts are Google-SSO-created with the SAME email the site logs in with.
2. Secondary: orders filtered by order `email` (for guest checkouts not attached to a customer account) — verify the `?email=` filter is supported on the instance; otherwise page + filter server-side with a cap.
3. Optional/tertiary: positions where `attendee_email` matches (attended on someone else's order) — only if product wants it; adds complexity/PII surface.

Security must-haves (server-side, never trust client):
- Match ONLY on `claims.email` from the validated token; ignore any email in query/body.
- Return sanitized summaries only (order code, event, date, status, counts, safe portal link). Never return `secret`, other attendees' PII, or admin URLs.
- Negative test: user A cannot fetch user B by param tampering.

Note on emails: order purchaser email may differ from attendee email, and Gmail dot/alias normalization should NOT be applied silently (privacy/impersonation risk). Backend already has `validation::email::normalize_email` — reuse it, but keep it conservative (lowercase+trim).

---

## E. SECURITY GAPS IN CURRENT CODE the plan must fix BEFORE shipping PII endpoints

These are real defects in the existing backend, not hypotheticals:

1. CORS is wildcard AND hardcoded.
   - `jakarta-backend/src/http/response.rs`: `json_success()` and `json_error()` call `cors_headers("*")` — they IGNORE `config.allowed_origins`.
   - `wrangler.toml`: `ALLOWED_ORIGINS = "*"`.
   - For endpoints returning personal orders and admin form submissions (PII), `Access-Control-Allow-Origin: *` lets ANY origin's JS call them with a forwarded/stolen bearer token. Fix: make `json_success` honor `allowed_origins`, and set `ALLOWED_ORIGINS` to the real website origin(s) before Phase 2/3 go live. The stored plan claims "CORS only allows website origins already configured" — the code does NOT; correct this claim.

2. Existing `/api/admin/reingest` is UNAUTHENTICATED.
   - `jakarta-backend/src/http/reingest.rs` `handle_reingest(_req, ctx)` never calls `extract_user` or checks admin — anyone can POST it and trigger a full Formbricks re-ingest.
   - The `/api/admin/*` path prefix currently guarantees nothing. The new admin dashboard MUST add a real guard, AND this existing route should be retrofitted with the same guard (or removed from public routing).

3. Raw response body logging leaks PII.
   - `formbricks/client.rs` `list_responses()` does `console_log!("FormBricks raw response: {}", body)` — full submission PII into Worker logs (observability logs are persisted per `wrangler.toml`). Remove or gate behind a debug flag before wiring admin/list endpoints. Directly conflicts with the plan's "no PII in logs" rule.

---

## F. FORMBRICKS ADMIN DASHBOARD — backend layer LARGELY EXISTS (scope reduction)

Stored Phase 0.4 treats Formbricks endpoint shape as unknown; the code already answers it.

Existing in `jakarta-backend/src/formbricks/`:
- `client.rs`: `list_responses(survey_id, limit, offset)` -> `GET /api/v2/management/responses?surveyId=&limit=&offset=` with `x-api-key` (VERIFIED matches Formbricks management API). Also `get_all_responses(max_pages)`, `get_response(id)`, `get_survey(id)` -> `GET /api/v1/management/surveys/{id}`.
- `types.rs`: `FormbricksResponse { id, survey_id, created_at, updated_at, finished, data: map, contact }`, `FormbricksResponseList { data, meta{total,limit,offset} }`, and `FormbricksSurvey` with BOTH legacy `questions[]` and new `blocks[].elements[]`, plus `FormbricksQuestion::headline_text()` (localized `{default}` + HTML stripping).
- `responses.rs`: `extract_answer`, `extract_answers_list` (single + array), `has_answer`.
- Route `GET /api/forms/:kind/:slug/schema` already returns question labels.

So Phase 3 backend work is mostly: add authed admin routes that call the EXISTING client methods + normalize to the website contract. Do NOT rebuild the Formbricks client. `list_responses`/`get_all_responses` are currently `#[allow(dead_code)]` (built, not yet wired) — wire them behind the admin guard.

Note: pagination is offset/limit (not cursor). Adjust the stored Phase 3 `next_cursor` contract to `limit`/`offset` (+ `meta.total`) to match reality, or normalize offset->page in the backend.

---

## G. CONFIG / ENV concrete deltas

- `AppConfig` (`jakarta-backend/src/config.rs`) has NO admin field today. Add `admin_emails: Vec<String>` parsed from `ADMIN_EMAILS` (comma-split, lowercased, trimmed) + an `is_admin(email)` helper. Add `PRETIX_*` fields likewise.
- Pretix token should be a READ-ONLY team token (view orders / view check-ins), not a full-access token. Stored plan just says `PRETIX_API_TOKEN=secret`.
- Pretix auth header is `Authorization: Token <token>` (team token), NOT `Bearer`. Make sure the backend Pretix client uses `Token`, mirroring the existing Formbricks `x-api-key` pattern in `client.rs`.

---

## H. SMALLER IMPROVEMENTS / MISSING CONSIDERATIONS

1. Stats cache store: stored plan uses D1. For a read-heavy TTL counter, Cloudflare KV or the Cache API is lighter than D1 writes. D1 is fine (binding exists) but KV/Cache API is the more natural fit for ephemeral stats. Optional.
2. Events index page: keep stats on the DETAIL page only (as the user asked). Do NOT fan out N stat calls on `/events` list. `event.id` is the slug -> `siteSlug={event.id}` is correct.
3. Attendance display gating: `checked_in_count` is only meaningful during/after the event. UI should hide or clearly zero it before the event start (compare against `event.data.date`).
4. Stats feature is independent of the iframe widget: it is a separate backend JSON call, so it works whether or not `PretixWidget` embeds via iframe (`disable-iframe`). No coupling.
5. `content.config.ts` today has `pretixUrl`, `pretixSubevent`, `pretixListType` only. Add `pretixCheckinListId` (primary need) and optional `pretixOrganizerSlug`/`pretixEventSlug`; prefer explicit slugs over parsing `pretixUrl`.
6. Frontend order-history + admin should reuse the existing 401->`signOut()` self-healing pattern already implemented in `ApplyVolunteerDialog.tsx`/`ApplySpeakerDialog.tsx` and the `error.status` propagation in `src/lib/api.ts`.

---

## I. Net effect on phasing

- Phase 0: shrink. Auth POC is a 5-min confirm (not a gate). Formbricks endpoint discovery is already answered by code. Keep: Pretix config inventory (organizer/event slugs, check-in list IDs) + confirm checkinlists positions `count`/`has_checkin` on the live instance + agree count definitions.
- Phase 1: simplify counting to 2 checkinlists-positions calls; add `pretixCheckinListId` frontmatter; consider KV/Cache for TTL.
- Phase 2: auth already exists; implement customer-by-email -> orders; DROP the Pretix-customer-OAuth sub-plan as unsupported.
- Phase 3: reuse existing FormbricksClient; add admin guard (+ retrofit `/api/admin/reingest`); fix offset/limit contract; remove raw-body PII log.
- Cross-cutting (do before Phase 2/3 ship): fix wildcard/hardcoded CORS, add `ADMIN_EMAILS` to AppConfig, read-only Pretix token, `Token` auth header.
