# Phase 4 — Hardening, Performance, and UX Follow-up

Goal: improve reliability, privacy, performance, observability, and mobile UX after the MVP features work.

## 4.1 Pretix stats performance

If live Pretix count calls are slow or rate-limited:

- Use Cloudflare Cache API or KV for short-lived event stats cache.
- D1 is acceptable if persistent history is desired, but ephemeral count data does not require D1.
- Refresh more often during active event windows and less often after event ends.
- Consider scheduled Worker/cron refresh if events have high traffic.

Suggested cache key:

```text
pretix_stats:{site_slug}:{checkin_list_id}:{subevent_id}
```

Suggested cached value:

```ts
interface CachedPretixEventStats {
  registered_count: number;
  checked_in_count: number;
  attendance_rate: number | null;
  refreshed_at: string;
  stale_after: string;
}
```

## 4.2 Pretix order history indexing

If live user-order lookup is slow or cannot filter efficiently:

- Build a backend D1 index from Pretix orders.
- Populate via scheduled sync and/or Pretix webhooks if available.
- Store only fields needed for order history.
- Prefer lookup by email hash where possible.

Example D1 table:

```sql
create table pretix_order_index (
  id text primary key,
  email_hash text not null,
  normalized_email text,
  order_code text not null,
  organizer_slug text not null,
  event_slug text not null,
  event_name text not null,
  event_date text,
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

Privacy note:
- If storing normalized emails, D1 contains PII.
- Restrict access and do not expose admin/raw indexes publicly.

## 4.3 Customer-account mismatch handling

If exact Google email matching misses valid orders:

Options, in order:

1. Show clear empty-state messaging:
   - “No orders found for this Google email. If you used a different email in Pretix, open Pretix customer portal.”

2. Provide safe link to Pretix customer portal:
   - User can log into Pretix directly with Google SSO.

3. Manual/admin resolution:
   - Admin can help users verify ownership and link emails if policy allows.

4. Only if Pretix later documents customer-account OAuth/delegation:
   - Add explicit “Link Pretix account” flow.

Do not scrape Pretix portal sessions or reuse cookies.

## 4.4 Admin dashboard UX improvements

After desktop MVP:

- Mobile card layout for responses.
- Saved filters per admin.
- CSV export endpoint guarded by admin auth.
- Per-form configurable preview columns.
- Review/assignment status for responses, if needed.
- Charts by form, date, finished status, role/division.
- Audit trail for viewing/exporting submission data.

## 4.5 Observability

Structured backend logs should include:

- request id
- integration name: Pretix/Formbricks
- endpoint category
- status code
- duration
- result count / page count
- cache hit/miss
- stale cache served or not

Never log:
- Google ID tokens
- Pretix API token
- Formbricks API key
- full order payloads
- full Formbricks responses
- full attendee/customer PII

Add alerts/manual checks for:
- Pretix 401/403 from integration calls
- Formbricks 401/403
- high 5xx rate on order/admin endpoints
- stale cache during event day

## 4.6 Security review checklist

Before broad rollout:

- Google JWT validation active in production.
- `ENABLE_DEBUG_AUTH=false` in production.
- `ALLOWED_ORIGINS` is not wildcard for authenticated endpoints.
- Every `/api/admin/*` route requires admin guard.
- User order endpoint cannot accept arbitrary email query/body.
- Formbricks and Pretix API keys are backend-only secrets.
- Read-only Pretix token has minimum required permissions.
- No raw PII response logging.
- Admin export endpoints require the same guard as the dashboard.

## 4.7 Regression validation

Website:

```bash
nvm use 22
bun run build
bunx astro check
```

Backend:
- Run existing build/tests from `jakarta-backend`.
- Add tests for:
  - Pretix stats count parsing
  - user-order auth and ownership
  - admin allowlist
  - CORS allowed/disallowed origins
  - Formbricks response normalization
  - API failure paths

Manual smoke tests:

1. Event with Pretix mapping shows registered and checked-in counts.
2. Event without Pretix mapping renders normally.
3. Signed-in user sees only own Pretix orders.
4. Signed-in user with no orders gets empty state.
5. Non-signed-in user cannot access order history data.
6. Admin sees Formbricks dashboard.
7. Non-admin cannot access dashboard APIs directly.
8. Pretix/Formbricks outage produces safe UI fallback and no secret/PII logs.

## Exit criteria

- MVP features are reliable under expected traffic.
- Sensitive data access is audited and constrained.
- Dashboard remains usable on mobile and polished on desktop.
- Performance bottlenecks have cache/index fallback paths.
