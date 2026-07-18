# Phase 4 — Hardening, Performance, and Follow-up Enhancements

Goal: improve reliability, privacy, observability, and UX after the initial Pretix/Formbricks features work.

## 4.1 Pretix stats performance

If live Pretix aggregation is slow:
- add D1 cache for event stats
- refresh with scheduled Worker cron every 5–15 minutes during event day
- refresh less frequently after event ends
- optionally process Pretix webhooks if available in the deployment

Suggested cache table:

```sql
create table pretix_event_stats_cache (
  site_slug text primary key,
  organizer_slug text not null,
  event_slug text not null,
  subevent_id text,
  checkin_list_id text,
  registered_count integer not null,
  checked_in_count integer not null,
  capacity integer,
  refreshed_at text not null,
  stale_after text not null
);
```

## 4.2 Pretix order history performance

If per-user live Pretix queries are slow or limited by API pagination:
- create a D1 order index refreshed by scheduled sync/webhook
- store only fields needed for user history
- use email hash for lookup where possible, but retain enough to support verified display if policy allows

Example index shape:

```sql
create table pretix_order_index (
  id text primary key,
  email_hash text not null,
  normalized_email text,
  order_code text not null,
  organizer_slug text not null,
  event_slug text not null,
  event_name text not null,
  order_datetime text,
  status text not null,
  attendee_count integer not null default 0,
  checked_in_count integer,
  total text,
  currency text,
  updated_at text not null
);

create index pretix_order_index_email_hash_idx on pretix_order_index(email_hash);
```

Privacy note: if storing normalized emails, treat D1 as containing PII and restrict access accordingly.

## 4.3 Better user/Pretix account linking

If exact email matching is insufficient:
- investigate Pretix OAuth / “Connect with pretix” for customer accounts and required scopes
- add explicit “Link Pretix account” flow only if supported
- otherwise provide a safe customer portal link to Pretix’s own Google SSO login
- avoid implementing fragile scraping/session-cookie approaches

## 4.4 Admin dashboard enhancements

After desktop MVP:
- mobile-specific response cards
- saved filters
- CSV export
- per-form column configuration
- response assignment/review status, if needed
- audit trail of admin views/exports
- charts by form/status/date

## 4.5 Observability and alerting

Add structured logs for backend integrations:
- request id
- integration name
- endpoint category
- HTTP status
- elapsed ms
- result count
- cache hit/miss

Do not log:
- API keys
- bearer tokens
- full response bodies
- raw PII

Add alerts/manual checks for:
- Pretix API 401/403 (token expired/revoked)
- Formbricks API 401/403 (key issue)
- high 5xx rate on admin/order endpoints
- cache staleness during event day

## 4.6 Security review

Checklist:
- all backend endpoints validate Google token server-side
- all admin endpoints enforce `ADMIN_EMAILS`
- CORS only allows expected website origins
- no frontend bundle contains Pretix/Formbricks secrets
- no logs contain tokens/secrets/PII payloads
- user order endpoint cannot be queried by arbitrary email
- admin export endpoints require same admin guard

## 4.7 Validation regression suite

Website:

```bash
nvm use 22
bun run build
bunx astro check
```

Backend:
- run existing backend build/test commands from `jakarta-backend`
- add endpoint tests for:
  - public event stats
  - user order auth/ownership
  - admin allowlist
  - Formbricks API failure normalization

Manual smoke tests:
1. Event with Pretix stats displays registered/checked-in counts.
2. Event without Pretix mapping still renders normally.
3. Signed-in user sees only own Pretix orders.
4. Non-signed-in user is prompted to sign in for order history.
5. Admin sees Formbricks dashboard.
6. Non-admin receives access denied and no data.
