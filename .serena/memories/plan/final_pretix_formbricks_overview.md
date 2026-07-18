# Final Plan — Pretix Event Stats, User Pretix Orders, and Formbricks Admin Dashboard

Created: 2026-07-04
Project: `jakarta-website` + `jakarta-backend`

## Goals covered

This plan covers all requested features:

1. `/events` event details show Pretix participant information:
   - registered participant count
   - attended / checked-in participant count
   - optional attendance rate and last refresh time
2. Logged-in website users can view their own historical Pretix orders.
3. Global Pretix information uses a backend-only Pretix API token. User-specific access uses the Google SSO token only to authenticate to our backend, not directly to Pretix.
4. Internal admin dashboard restricted by env-configured admin emails, pulling Formbricks submissions through backend APIs, with desktop view prioritized first.

## Documentation-backed architecture decision

### Google SSO token cannot be shared directly with Pretix REST API

Pretix REST API documentation shows Pretix APIs accept Pretix authentication mechanisms such as:
- `Authorization: Token <pretix-team-token>` for organizer/team API access
- Pretix-issued OAuth bearer tokens for Pretix staff/organizer apps
- device/check-in authentication for scanner-style clients

Google OAuth / OpenID Connect documentation shows Google ID tokens are issued with:
- `iss` from Google
- `aud` equal to the Google OAuth client ID
- user claims such as `email` and `email_verified`

A Google ID/access token is not a Pretix-issued token and is not documented as accepted by Pretix. Even if Pretix customer accounts are created through Google SSO, that only means Pretix can authenticate the user in its own customer portal; it does not mean this website can reuse the Google token as a Pretix REST API bearer token.

## Final auth model

```text
Browser / jakarta-website
  -> user signs in with Google Identity Services
  -> browser sends Authorization: Bearer <google_id_token> to jakarta-backend
  -> jakarta-backend validates Google token and email_verified
  -> jakarta-backend uses backend-only Pretix/Formbricks API keys
  -> jakarta-backend returns sanitized aggregate/user/admin-scoped data
```

This satisfies the intent of user-specific access because the user’s Google bearer token is still the authorization credential for our backend. It is just not sent to Pretix as Pretix API authentication.

## Existing project facts to reuse

- `jakarta-website` already has Google Identity Services frontend auth and API helpers.
- `jakarta-backend` already has production Google JWT validation using Google JWKS, audience, issuer, expiration, and `email_verified` checks.
- `jakarta-backend` already has Formbricks Management API client methods for surveys/responses; admin dashboard should wire existing methods instead of rebuilding them.
- `src/content.config.ts` already has event Pretix fields such as `pretixUrl`, `pretixSubevent`, and `pretixListType`.
- `src/components/PretixWidget.tsx` already handles Pretix iframe/widget embedding. New stats work should be separate from the widget.

## Cross-cutting security fixes required before PII features

Before shipping user order history or admin dashboard:

1. Fix backend CORS for authenticated/PII endpoints.
   - Do not use wildcard `Access-Control-Allow-Origin: *` for personal orders or admin Formbricks data.
   - Honor configured allowed origins and set production origins explicitly.

2. Add a real admin guard for all `/api/admin/*` routes.
   - The route prefix alone is not security.
   - Existing admin maintenance endpoints should be protected or removed from public routing.

3. Remove or gate raw Formbricks response logging.
   - Do not log full response bodies, tokens, API keys, order payloads, or form answers.

4. Use least-privilege Pretix credentials.
   - Prefer a read-only Pretix team/API token that can view orders and check-in lists but cannot modify orders.
   - Backend Pretix client should use Pretix token auth (`Authorization: Token <token>`), not Google bearer auth.

## Final memory map

Execute in this order:

1. `plan/final_pretix_formbricks_phase_0_discovery_and_security`
2. `plan/final_pretix_formbricks_phase_1_event_stats`
3. `plan/final_pretix_formbricks_phase_2_user_order_history`
4. `plan/final_pretix_formbricks_phase_3_formbricks_admin_dashboard`
5. `plan/final_pretix_formbricks_phase_4_hardening_and_ux`

## Non-goals for the first implementation

- Do not build a Pretix checkout replacement.
- Do not scrape Pretix customer portal sessions/cookies.
- Do not expose Pretix or Formbricks API keys to the browser.
- Do not add a separate Pretix OAuth account-linking flow unless Pretix documentation confirms customer-account order delegation is supported; current Pretix OAuth is primarily for Pretix staff/organizer API access, not ticket-buyer customer order history.
