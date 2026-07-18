# Phase 0 — Discovery, Security Baseline, and POCs

Goal: verify real Pretix instance configuration and fix security prerequisites before adding new PII or admin-facing features.

## 0.1 Confirm Pretix configuration

Collect this mapping for every website event that should show stats:

```text
website_event_slug | pretix_base_url | pretix_organizer_slug | pretix_event_slug | pretix_checkin_list_id | pretix_subevent_id | notes
```

Required:
- `website_event_slug` — Astro content event slug, e.g. `event.id`.
- `pretix_base_url` — e.g. `https://pretix.eu` or self-hosted Pretix domain.
- `pretix_organizer_slug`.
- `pretix_event_slug`.
- `pretix_checkin_list_id` — most important for participant/attendance counts.

Optional:
- `pretix_subevent_id` if the Pretix event is an event series.
- `item__in` filter only if the check-in list is not already scoped to participant tickets.

Preferred rule: configure the authoritative Pretix check-in list correctly in Pretix, then use that list for counts. Avoid duplicating product/item filter logic in the website unless required.

## 0.2 Verify Pretix stats endpoint on real instance

Pretix docs show this endpoint returns a paginated response with a top-level `count`:

```http
GET /api/v1/organizers/{organizer}/events/{event}/checkinlists/{list}/positions/
Authorization: Token <pretix-api-token>
```

Important query parameters:
- `has_checkin=true` — only checked-in positions.
- `subevent={id}` — for event series.
- `item__in=1,2,3` — optional ticket item filter.
- `order__status__in=...` — optional if business rules need custom order status filtering.

POC calls:

```text
registered_count: GET .../positions/?page_size=1
checked_in_count: GET .../positions/?page_size=1&has_checkin=true
```

Only read the top-level `count`; do not page through all results for the stats MVP.

Also verify whether the check-in list detail endpoint exposes direct aggregate fields such as `position_count` / `checkin_count` on this Pretix version. If available, use that one-call method; otherwise use the two `positions` count calls.

## 0.3 Confirm Google token direct-to-Pretix behavior

Run one quick POC only to document the outcome:

```http
GET /api/v1/organizers/{organizer}/events/{event}/checkinlists/{list}/positions/
Authorization: Bearer <google_id_token>
```

Expected: unauthorized.

Decision is already clear from docs: do not design production around Google token direct-to-Pretix. Use Google token to authenticate to `jakarta-backend`; backend uses Pretix API token.

## 0.4 Verify user-order matching paths

Pretix order history options to test:

1. Customer lookup by email:
   - `GET /api/v1/organizers/{organizer}/customers/?email={verified_google_email}`
   - Use returned customer identifier to find linked orders if supported by current Pretix API.

2. Order lookup by purchaser email:
   - verify whether orders endpoint supports email filtering in current Pretix deployment.
   - If no efficient filter exists, plan for backend D1 indexing in Phase 4.

3. Optional attendee-email lookup:
   - only if product wants to show tickets where the user is an attendee but not purchaser.
   - keep out of MVP unless needed because it increases PII complexity.

## 0.5 Verify Formbricks API shape

Current `jakarta-backend` already uses Formbricks Management API. Confirm deployed version supports:

```http
GET /api/v2/management/responses?surveyId={surveyId}&limit={limit}&offset={offset}
x-api-key: <formbricks-api-key>
```

and survey schema endpoint:

```http
GET /api/v1/management/surveys/{surveyId}
x-api-key: <formbricks-api-key>
```

If actual deployment differs, update the existing backend Formbricks client once and keep the frontend contract stable.

## 0.6 Fix security prerequisites

Before Phase 2 or Phase 3:

### CORS

- Backend responses for authenticated data must not return wildcard CORS.
- Parse allowed origins from env.
- Reflect the request origin only if it is allowed.
- Production env should include only trusted frontend origins, e.g. `https://jakarta.awscommunity.id` and any preview/local origins intentionally allowed.

### Admin guard

Add to `jakarta-backend` config:

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Parse as lowercase, trimmed set/list.

Create helper:

```text
require_admin(request, config)
  -> extract_user(request, config)
  -> require email_verified already enforced by Google validator
  -> check normalized email in ADMIN_EMAILS
  -> return 401/403 appropriately
```

Apply this guard to all `/api/admin/*` routes, including existing maintenance routes.

### Logging

Remove/gate logs that include:
- full Formbricks raw responses
- full Pretix raw orders
- tokens/API keys
- full form answers
- full attendee/customer PII

Allowed logs:
- request id
- endpoint category
- status code
- duration
- count/page count
- event slug / survey id
- cache hit/miss

## 0.7 Environment variables

Backend (`jakarta-backend`) additions:

```env
PRETIX_API_BASE_URL=https://pretix.example.com
PRETIX_API_TOKEN=secret-readonly-token
PRETIX_DEFAULT_ORGANIZER=aws-user-group-jakarta
ADMIN_EMAILS=admin1@example.com,admin2@example.com
ALLOWED_ORIGINS=https://jakarta.awscommunity.id,http://localhost:4321
```

Existing backend env to keep:

```env
FORMBRICKS_BASE_URL=https://forms.awscommunity.id
FORMBRICKS_API_KEY=secret
GOOGLE_CLIENT_ID=...
ENABLE_DEBUG_AUTH=false
```

Frontend stays public-only:

```env
PUBLIC_BACKEND_API_URL=https://jakarta-backend.example.com
PUBLIC_GOOGLE_CLIENT_ID=...
```

## Exit criteria

- Real event check-in list can return registered and checked-in `count` values.
- Google token direct-to-Pretix result is documented as unsupported/unauthorized.
- User-order matching method is known for at least one real test user.
- Formbricks response and survey endpoints are confirmed.
- CORS and admin-guard fixes are planned as first implementation tasks before any PII routes ship.
