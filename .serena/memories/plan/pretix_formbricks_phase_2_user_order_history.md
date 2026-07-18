# Phase 2 — Signed-in User Pretix Order History

Goal: allow users logged into the website with Google SSO to view their own historical Pretix orders.

## Critical auth decision

Do **not** rely on the Google SSO token as a direct Pretix API bearer token in production.

Reasoning from docs:
- Pretix REST API supports Pretix API tokens, Pretix OAuth / “Connect with pretix”, and device auth.
- Google ID tokens are issued by Google with `aud = <Google OAuth client ID>` and prove identity to this website/backend.
- Google access tokens authorize Google APIs/scopes, not Pretix APIs.
- A Pretix customer account using Google SSO means the user can sign into Pretix via Google, but it does not mean Pretix REST API accepts the website’s Google token.

Recommended production flow:

```text
User signs in with Google on website
  -> browser stores Google ID token
  -> browser calls jakarta-backend with Authorization: Bearer <google_id_token>
  -> jakarta-backend validates Google token and email_verified
  -> jakarta-backend queries Pretix using backend-only Pretix API token
  -> jakarta-backend filters Pretix orders/customers to the authenticated email only
  -> website displays sanitized order history
```

This still uses the user bearer token for user-specific access at our backend boundary, but not as Pretix API auth.

## Alternative to evaluate later

Pretix OAuth / “Connect with pretix”:
- Could be used if Pretix supports the needed customer-account order scopes.
- Requires registering a Pretix OAuth application and storing Pretix refresh/access tokens per user.
- This is a separate account-linking flow, not Google token sharing.
- Treat as Phase 2B only after checking if customer accounts are supported by the OAuth API in the current Pretix deployment.

## Backend endpoint

Preferred in `jakarta-backend`:

```http
GET /api/pretix/me/orders
Authorization: Bearer <google_id_token>
```

Optional query params:

```text
?status=all|active|paid|canceled
?limit=20
?cursor=...
```

Response shape:

```ts
interface UserPretixOrderSummary {
  order_code: string;
  event_slug: string;
  event_name: string;
  event_date: string | null;
  order_datetime: string | null;
  status: string;
  total: string | null;
  currency: string | null;
  attendee_count: number;
  checked_in_count: number | null;
  pretix_customer_portal_url: string | null;
}

interface UserPretixOrdersResponse {
  orders: UserPretixOrderSummary[];
  next_cursor: string | null;
}
```

Do not expose:
- Pretix API token
- raw order secrets unless explicitly needed and safe
- other attendees’ PII from shared orders unless policy approves
- admin order URLs

## User matching strategy

Primary match:
- normalized verified Google email == Pretix order email or Pretix customer email

Normalization:
- lowercase
- trim whitespace
- do **not** over-normalize Gmail aliases/dots unless explicitly accepted by policy

Potential issue:
- Order purchaser email may differ from attendee email.
- Pretix customer account email may differ from order email.

Resolution path:
1. Phase 2A: exact verified email match only.
2. Phase 2B: if needed, support account-linking by verifying ownership through Pretix customer portal/OAuth, or allow admins to resolve mismatches manually.

## Pretix querying approach

Phase 2A POC choices:

1. Query Pretix customers by email, then orders for customer.
2. Query organizer/event orders with email filters if supported.
3. If no efficient filter exists, maintain local D1 index from scheduled sync/webhooks:
   - `email_hash`
   - `order_code`
   - `event_slug`
   - status
   - attendee_count
   - checked_in_count
   - updated_at

Start with live query only if Pretix supports efficient filtering/pagination for the expected volume.

## Frontend UI

Add a user-facing page, likely:

```text
/orders
```

or:

```text
/account/orders
```

Add a menu item in `src/components/auth/UserMenu.tsx`:
- “My Pretix Orders” or “My Event Orders”
- shown only when signed in

Add component:

```text
src/components/auth/UserPretixOrdersDashboard.tsx
```

Behavior:
- reuse existing `AuthProvider` and `GoogleSignInButton` patterns
- if not signed in: show sign-in-required card
- if signed in: fetch `GET /api/pretix/me/orders`
- handle 401 by `signOut()` like existing application dashboard
- show empty state if no orders
- show order cards/table:
  - event name
  - order date/code
  - status badge
  - attendee count
  - checked-in count, if past/current event
  - link to Pretix customer portal if safe

Design:
- mobile-first card list
- desktop can become two-column cards or table
- dark-mode token classes

## Security/privacy checklist

- Backend validates Google ID token signature, issuer, audience, expiration, and `email_verified`.
- Backend never trusts email sent by client body/query.
- Backend filters by authenticated email server-side.
- Backend returns only sanitized fields.
- Add rate limiting or cache per user if Pretix API is slow.
- Do not log raw order payloads or PII.

## Validation

- POC with a test Pretix user/order matching the Google email.
- Negative test: user A cannot access user B orders by changing query params.
- 401 test for missing/expired Google token.
- Build/check:
  - `nvm use 22`
  - `bun run build`
  - `bunx astro check`

## Exit criteria

- Signed-in user can view only their own Pretix order summaries.
- Direct Google-token-to-Pretix assumption has been validated and documented.
- No Pretix secrets or other-user PII reach the browser.
