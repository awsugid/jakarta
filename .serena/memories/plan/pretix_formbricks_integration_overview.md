# Pretix + User Orders + Formbricks Admin Dashboard — Integration Overview

Created: 2026-07-04
Project: `jakarta-website` + existing `jakarta-backend`

## User goals covered

1. `/events` should connect to Pretix and show event-level participant information:
   - registered / valid participants
   - attended / checked-in participants
   - ideally attendance rate
2. Signed-in users should be able to view historical Pretix orders.
3. Global Pretix information can use a Pretix API key, but user-specific information was proposed to use the Google SSO bearer token directly with Pretix.
4. Add an internal admin dashboard, restricted by admin emails in env vars, pulling granular Formbricks submission data. Desktop view is the first priority.

## Documentation findings

### Pretix
Official Pretix docs reviewed via Context7 (`/websites/pretix_eu`) show the REST API supports:
- token-based authentication
- Pretix OAuth / “Connect with pretix”
- device authentication
- Orders resources
- Customers resources
- Check-in lists / check-in APIs

Important conclusion: Pretix REST authentication is not documented as accepting arbitrary Google ID tokens or Google OAuth access tokens as `Authorization: Bearer` tokens. A Google token is audience-bound to the Google OAuth client / Google APIs, while Pretix expects Pretix API tokens, Pretix OAuth access tokens, or device auth tokens.

### Google OAuth / Identity
Official Google OAuth docs reviewed via Context7 (`/websites/developers_google_identity_protocols_oauth2`) show:
- Google ID tokens contain claims like `iss`, `aud`, `email`, `email_verified`, `exp`.
- The `aud` claim is the Google client ID.
- Google access tokens authorize Google API scopes, not third-party Pretix APIs unless Pretix explicitly implements token exchange / federation for those tokens.

Important conclusion: using the same Google SSO credentials in Pretix customer login does **not** imply that the website can reuse the Google ID/access token to call Pretix APIs directly.

### Formbricks
Official Formbricks docs reviewed via Context7 (`/formbricks/formbricks`) show:
- Public client APIs can create/update survey responses without exposing management secrets.
- Management APIs can list surveys and responses using an API key, e.g. response listing by survey.
- API key must stay backend-only.

Important conclusion: the internal dashboard should call our backend, and the backend should call Formbricks Management API using `FORMBRICKS_API_KEY`.

### Cloudflare Pages Functions
Official Cloudflare Pages docs reviewed via Context7 (`/websites/developers_cloudflare_pages`) show Pages Functions can access server-side env bindings/secrets via `context.env`.

Important conclusion: if any integration is implemented inside `jakarta-website`, it must be through `functions/api/*`; however, because existing Google-authenticated application APIs already use `jakarta-backend`, the preferred architecture is to keep Pretix and Formbricks admin API proxies in `jakarta-backend` for one shared auth/secret boundary.

## Architecture recommendation

Use `jakarta-backend` as the primary integration gateway:

```text
Browser / Astro website
  -> Google Identity Services sign-in
  -> sends Authorization: Bearer <google_id_token> to jakarta-backend
  -> jakarta-backend validates Google ID token
  -> jakarta-backend checks admin email allowlist when needed
  -> jakarta-backend calls Pretix / Formbricks with backend-only API keys
  -> browser receives sanitized, user-scoped or aggregate data only
```

Why not call Pretix directly from browser?
- Pretix API key would be exposed.
- Google bearer token is not expected to authenticate against Pretix REST API.
- User-specific filtering must be enforced server-side to avoid leaking other orders.

## Most likely problem sources to validate first

Potential sources considered:
1. Google token cannot authenticate directly to Pretix REST API.
2. Pretix “participant count” might need order-position counting, not raw order counting.
3. Attendance count depends on the correct check-in list and possibly subevent.
4. Astro static pages cannot securely hold Pretix/Formbricks API keys.
5. Formbricks Management API endpoint shape can vary by deployed version.
6. Email matching can fail due to aliases, case, or different Pretix billing vs attendee emails.
7. Pretix/Formbricks pagination and rate limits can make live scans slow.

Most likely blockers:
1. **Auth mismatch**: Google token direct-to-Pretix is unlikely to work.
2. **Data model ambiguity**: counts and order history require correct event/subevent/check-in-list/customer/email mapping.

Before implementation, add short-lived sanitized logs in backend POC endpoints:
- log requested site event slug / Pretix organizer / Pretix event / subevent / check-in list
- log Pretix response status, page count, and aggregate counts only
- log Formbricks response status, survey id, page count, and aggregate counts only
- log auth decision as `authenticated=true`, `admin=true/false`, no raw tokens
- never log API keys, Google tokens, full Formbricks answers, or full order/customer PII

## High-level phased execution

1. **Phase 0 — Discovery / POC / instrumentation**
   - Verify Pretix endpoints and exact response fields against the real Pretix instance.
   - Test direct Google-token-to-Pretix once as a POC only; expect failure unless Pretix has custom federation.
   - Confirm Formbricks Management API endpoint shape for the deployed version.

2. **Phase 1 — Pretix event stats foundation**
   - Add event-to-Pretix mapping fields.
   - Build backend aggregate stats endpoint.
   - Add frontend event detail stats cards.

3. **Phase 2 — Signed-in Pretix order history**
   - Use Google token only to authenticate to our backend.
   - Backend queries Pretix with API key and filters orders by verified Google email / customer mapping.
   - Add user-facing order history page and menu item.

4. **Phase 3 — Internal Formbricks admin dashboard**
   - Add backend admin guard using env allowlisted emails.
   - Add backend Formbricks response proxy endpoints.
   - Build desktop-first admin data table and detail drawer.

5. **Phase 4 — Hardening / performance**
   - Add cache tables, scheduled refresh, or webhooks if live API scans are slow.
   - Tighten audit logs, error states, pagination, exports, and mobile dashboard layout.

## Key assumption

The current website already has Google Identity Services auth and the existing `jakarta-backend` validates or is expected to validate Google ID tokens for authenticated APIs. This plan reuses that auth boundary rather than creating a separate auth mechanism in the Astro site.