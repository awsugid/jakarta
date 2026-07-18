# jakarta-backend Phase 0 + 2 + 3 implementation

Compiled clean (`cargo check --offline` exit 0), all 94 tests pass.

## Files changed

### Phase 0 (security baseline)
- `src/config.rs` — added `admin_emails: Vec<String>` (env `ADMIN_EMAILS`, comma-separated, trimmed+lowercased) and `pretix_default_organizer: String` (env `PRETIX_DEFAULT_ORGANIZER`, default empty). Added `is_admin(&self, email: &str) -> bool` (compares `email.trim().to_lowercase()`).
- `src/auth/admin.rs` — NEW. `require_user(req, config)` delegates to `extract_user`. `require_admin(req, config)` calls `require_user` then `is_admin`, returns `AppError::Forbidden("Admin access required.")` otherwise.
- `src/auth/mod.rs` — added `pub mod admin;`.
- `src/http/response.rs` — kept `json_success` / `json_error` (public, wildcard CORS) and `with_cors`. Added `json_success_cors(data, allowed_origins, request_origin)`, `with_cors_origin(response, allowed_origins, request_origin)`, plus private `resolve_origin(allowed, req_origin) -> Option<String>` (reflects Origin only if listed; `*`/empty allowed_origins falls back to `*`). 5 unit tests added.
- `src/http/reingest.rs` — `handle_reingest` now builds `AppConfig` first, calls `require_admin(&req, &config).await?` before work. Early-return `Response::error` calls replaced with `AppError::Internal` so central error handler in `lib.rs` emits correct status.
- `src/formbricks/client.rs` — removed `worker::console_log!("FormBricks raw response: {}", body);` inside `list_responses` (PII leak). Replaced with count-only log after successful parse: `console_log!("FormBricks survey {} responses page fetched", survey_id)`.
- `src/lib.rs` — untouched (last-resort `*` fallback kept per spec).

### Phase 2 (user Pretix orders)
- `src/pretix/orders.rs` — NEW. `UserPretixOrderSummary` (`camelCase`) with fields: `orderCode, eventSlug, eventName, eventDate, orderDatetime, status, attendeeCount, checkedInCount, total, currency, pretixCustomerPortalUrl`. `UserPretixOrdersResponse { orders, total, limit, offset }`.
- `src/pretix/mod.rs` — added `pub mod orders;`.
- `src/pretix/client.rs` — added `PretixClient::list_orders_for_email(organizer, event: Option, email, limit, offset, status: Option) -> Result<PretixOrderListPage, String>`. Calls `GET {base}/api/v1/organizers/{organizer}/orders/?email={email}&limit={limit}&offset={offset}[&event=...][&status=...]` with `Authorization: Token {token}`. Status `"all"` (case-insensitive) skips status param. Parses top-level `count` and `results[]`; each result mapped via `map_order_summary` (positions array length → attendee_count; total coerced from string or number; event_name blank, event_date None, checked_in_count None, pretix_customer_portal_url None).
- `src/http/user_orders.rs` — NEW. `handle_my_pretix_orders(req, ctx)`:
  1. Build config, `require_user` (NOT admin).
  2. Empty `pretix_default_organizer` → `AppError::Internal("PRETIX_DEFAULT_ORGANIZER not configured")`.
  3. Query params: `limit` default 20 clamp 1..100, `offset` default 0, `status` default None.
  4. Calls `PretixClient::list_orders_for_email(organizer, None, &user.normalized_email(), limit, offset, status.as_deref())`.
  5. Errors wrapped `AppError::FormBricksError(format!("Pretix: {e}"))` → 502.
  6. Returns `UserPretixOrdersResponse` via `json_success_cors` with request Origin reflection.
- `src/http/mod.rs` — added `pub mod user_orders;`.

### Phase 3 (admin dashboard)
- `src/http/admin.rs` — NEW. All handlers call `require_admin(&req, &config).await?` and return via `json_success_cors`.
- `src/http/mod.rs` — added `pub mod admin;`.

## Routes added (registration order in `src/http/routes.rs`)

After `/api/admin/reingest`, before `/api/*rest` OPTIONS:

```
POST /api/admin/reingest                                (now admin-guarded)
GET  /api/admin/me                                      -> handle_admin_me
GET  /api/admin/forms                                   -> handle_admin_forms
GET  /api/admin/formbricks/responses                    -> handle_admin_responses
GET  /api/admin/formbricks/responses/:responseId        -> handle_admin_response_detail
GET  /api/pretix/me/orders                              -> handle_my_pretix_orders
```

## API contract (frontend verification target)

All authed endpoints expect header `Authorization: Bearer <google_id_token>`. CORS reflects request `Origin` only if listed in backend `ALLOWED_ORIGINS` env (wildcard fallback if `*` or empty).

### GET /api/pretix/me/orders
Query: `?limit=20&offset=0&status=all|paid|canceled|...` (limit clamped 1..100)
200:
```json
{
  "orders": [{
    "orderCode": "ABC12",
    "eventSlug": "event-slug",
    "eventName": "",
    "eventDate": null,
    "orderDatetime": "2025-01-01T00:00:00",
    "status": "p",
    "attendeeCount": 2,
    "checkedInCount": null,
    "total": "0.00",
    "currency": "EUR",
    "pretixCustomerPortalUrl": null
  }],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```
Errors: 401 missing/invalid token; 500 `PRETIX_DEFAULT_ORGANIZER not configured`; 502 Pretix upstream failure.

### GET /api/admin/me
200: `{ "email": "...", "name": "...|null", "picture": "...|null", "is_admin": true }`
401 no token; 403 non-admin.

### GET /api/admin/forms
200: array of `{ kind, slug, title, description: string|null, surveyId, isActive, responseCount: null }`
(NOTE: serde camelCase — field names serialized as camelCase. `survey_id` → `surveyId`, `is_active` → `isActive`, `response_count` → `responseCount`.)

### GET /api/admin/formbricks/responses?surveyId=...&limit=50&offset=0&finished=all|true|false
200:
```json
{
  "items": [{
    "id": "...",
    "surveyId": "...",
    "submittedAt": "...|null",
    "updatedAt": "...",
    "finished": true,
    "respondentEmail": "...|null",
    "respondentName": "...|null",
    "previewAnswers": { "Question label": "short answer ≤80 chars" }
  }],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```
- `surveyId` required (400 if missing).
- `limit` clamp 1..100, `offset` default 0.
- `finished=all`/unset → all; `finished=true`/`false` → filter.
- `previewAnswers`: first 3 questions with non-empty answers (survey-definition order), value truncated to 80 chars.
- `respondentEmail` / `respondentName`: from `contact.attributes.email` / `name`; else first non-empty answer whose question label contains "email" / "name".

### GET /api/admin/formbricks/responses/:responseId?surveyId=...
200:
```json
{
  "id": "...",
  "surveyId": "...",
  "submittedAt": "...|null",
  "updatedAt": "...",
  "finished": true,
  "answers": [
    { "questionId": "...", "label": "...", "type": "openText", "value": <raw json value> }
  ],
  "metadata": { "contactId": "...|null" }
}
```
- `responseId` path param required.
- `surveyId` query param required (400 if missing).
- `answers`: every question on the survey schema that has a non-null value in the response. Value is the raw JSON stored in Formbricks (string/array/object/etc.) — frontend renders per `type`.
- `submittedAt` = `createdAt` when `finished=true`, else null.

## CORS behavior recap

- Public endpoints (`/api/forms*`, public form routes, pretix-stats, webhook) still use `with_cors(resp, &config.allowed_origins)` (or wildcard `json_success`).
- New authed routes (`/api/admin/*`, `/api/pretix/me/orders`) use `json_success_cors(data, &config.allowed_origins, request_origin)` — Origin header reflected only if listed.
- OPTIONS `/api/*rest` preflight unchanged.
- `lib.rs` top-level error fallback still reads `ALLOWED_ORIGINS` directly and may emit `*` (intentional last-resort).

## Env vars to set in production Cloudflare Worker

```
PRETIX_DEFAULT_ORGANIZER=<organizer slug, e.g. aws-user-group-jakarta>
ADMIN_EMAILS=admin1@example.com,admin2@example.com
ALLOWED_ORIGINS=https://jakarta.awscommunity.id,http://localhost:4321
```
Already required (unchanged): `FORMBRICKS_BASE_URL`, `FORMBRICKS_API_KEY`, `PRETIX_API_BASE_URL`, `PRETIX_API_TOKEN`, `GOOGLE_CLIENT_ID`, `ENABLE_DEBUG_AUTH`.

## Validation

- `cargo check --offline` — EXIT 0, no warnings.
- `cargo test --offline --lib` — 94 passed, 0 failed (includes 5 new `http::response::tests::*` for `resolve_origin`).
- Not deployed, not committed, not pushed (per constraints).

## Unresolved / out of scope

- No new `AppError::PretixError` variant added (spec allowed reusing `FormBricksError`). Both Pretix and Formbricks upstream failures now surface as HTTP 502.
- Formbricks `surveyId` for `/api/admin/formbricks/responses/:responseId` is a required query param (spec said optional, but the survey schema is needed for label mapping; treated as required to avoid a second round trip guessing survey from response).
- `response_count` in `AdminFormSummary` always null (MVP per spec).
- No D1 schema migration needed for these phases.
- `wrangler.toml` not modified — operator must add `PRETIX_DEFAULT_ORGANIZER` and `ADMIN_EMAILS` vars via dashboard/CLI before deploy.
