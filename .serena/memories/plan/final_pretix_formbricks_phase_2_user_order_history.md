# Phase 2 — Logged-in User Pretix Order History

Goal: allow Google-signed-in website users to view their own historical Pretix orders.

## Critical auth decision

Do not call Pretix directly from the browser with a Google bearer token.

Production flow:

```text
User signs in with Google on jakarta-website
  -> AuthProvider stores Google ID token
  -> frontend calls jakarta-backend with Authorization: Bearer <google_id_token>
  -> jakarta-backend validates Google ID token and email_verified
  -> jakarta-backend queries Pretix with backend-only read-only Pretix API token
  -> jakarta-backend filters orders by authenticated Google email/customer mapping
  -> frontend displays sanitized order summaries
```

Why:
- Google tokens are issued for Google/this app audience, not Pretix API.
- Pretix REST API expects Pretix auth (`Token <token>`, Pretix-issued OAuth bearer token, or device auth).
- Pretix customer Google SSO does not expose a documented customer-account bearer token API for this website to use.
- Pretix OAuth is primarily for Pretix staff/organizer API delegation, not ticket-buyer customer order history.

## Dependencies

Must complete before this phase ships:
- Phase 0 CORS fix for authenticated endpoints.
- Phase 0 admin/security logging cleanup for PII-safe logs.
- Pretix read-only API token configured in backend.

Existing auth to reuse:
- `jakarta-backend` already validates Google ID tokens.
- `jakarta-website/src/components/auth/AuthProvider.tsx` already stores/provides `idToken`.
- `jakarta-website/src/lib/api.ts` already has patterns for authenticated backend calls and 401 handling.

## Backend endpoint

Add in `jakarta-backend`:

```http
GET /api/pretix/me/orders
Authorization: Bearer <google_id_token>
```

Optional query params:

```text
?limit=20&offset=0&status=all|active|paid|canceled
```

Use offset/limit unless a cursor is introduced by the backend index later.

Response:

```ts
interface UserPretixOrderSummary {
  order_code: string;
  event_slug: string;
  event_name: string;
  event_date: string | null;
  order_datetime: string | null;
  status: string;
  attendee_count: number;
  checked_in_count: number | null;
  total: string | null;
  currency: string | null;
  pretix_customer_portal_url: string | null;
}

interface UserPretixOrdersResponse {
  orders: UserPretixOrderSummary[];
  total: number | null;
  limit: number;
  offset: number;
}
```

Do not return:
- Pretix API token
- ticket `secret` / `web_secret`
- admin URLs
- full order payloads
- other attendees’ PII unless explicitly approved later

## Matching strategy

Backend derives user identity only from validated Google claims:

```text
verified_email = claims.email
normalized_email = lowercase(trim(verified_email))
```

Never trust email from query/body.

Lookup order:

1. Customer account match:
   - Use Pretix customer endpoint filtered by the verified Google email if supported by the instance.
   - Best aligns with the user’s assumption that Pretix customer accounts are Google SSO-created with the same email.

2. Order purchaser email match:
   - Use Pretix order endpoint filtering by order email if supported.
   - If unsupported, use bounded server-side pagination for MVP only on low volume.

3. Optional attendee email match:
   - Include tickets where `attendee_email` matches the Google email even if someone else bought the order.
   - Defer unless product explicitly needs it because it increases complexity and privacy surface.

Do not normalize Gmail dots/aliases unless there is a written product/security decision. Conservative email normalization only: lowercase + trim.

## Backend implementation notes

Add Pretix client module in `jakarta-backend`:

```text
src/pretix/client.rs
src/pretix/types.rs
```

Config additions:

```text
pretix_api_base_url
pretix_api_token
pretix_default_organizer
```

Pretix request header:

```http
Authorization: Token <PRETIX_API_TOKEN>
Accept: application/json
```

Error handling:
- Pretix 401/403 -> backend 502 or integration error, not user 401.
- Missing/invalid Google token -> 401.
- Valid user but no orders -> 200 with empty list.

Logging:
- Log result counts and response status only.
- Do not log order body or user PII. If needed, log a hash of normalized email, not raw email.

## Frontend route and components

Add page:

```text
src/pages/account/orders.astro
```

or if simpler:

```text
src/pages/orders.astro
```

Recommended component:

```text
src/components/auth/UserPretixOrdersDashboard.tsx
```

Add menu entry in:

```text
src/components/auth/UserMenu.tsx
```

Label ideas:
- “My Event Orders”
- “My Pretix Orders”

Behavior:
- If not signed in: show sign-in-required card using existing Google auth flow.
- If signed in: call `GET /api/pretix/me/orders` with existing API helper.
- On 401: sign out / prompt re-login using existing pattern.
- Empty state: “No Pretix orders found for this Google email.”
- Display cards/table:
  - event name
  - event date
  - order code
  - order status badge
  - attendee count
  - checked-in count if available
  - total/currency if safe/useful
  - link to Pretix customer portal if safe

Design:
- Mobile-first card list.
- Desktop can use a table or two-column cards.
- Token classes and dark-mode defaults.

## Privacy/security tests

Backend tests:
- missing token -> 401
- invalid/expired token -> 401
- user A cannot request user B orders by changing query params
- valid user with no orders -> empty 200
- Pretix API failure -> safe error response with no token/body leak

Manual tests:
- Google email with known Pretix customer/order
- Google email with no orders
- order purchaser email differs from Google email
- expired token behavior

## Validation

Website:

```bash
nvm use 22
bun run build
bunx astro check
```

Backend:
- run backend build/test commands from `jakarta-backend`
- add focused tests for Pretix client parsing and authenticated route ownership

## Exit criteria

- Logged-in user sees only their own sanitized Pretix order summaries.
- Google token is used only for `jakarta-backend` authentication.
- Pretix API key remains backend-only.
- No other-user PII reaches the browser.
