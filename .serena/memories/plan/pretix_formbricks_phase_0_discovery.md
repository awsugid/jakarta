# Phase 0 — Discovery, POCs, and Instrumentation

Goal: validate Pretix, Google SSO, and Formbricks assumptions before implementing production UI.

## 0.1 Pretix configuration inventory

Collect the following for the real Pretix instance:

- Pretix base URL, e.g. `https://pretix.eu` or self-hosted domain.
- Organizer slug.
- Event slug for each website event.
- Whether events are normal events or event series with subevents.
- Relevant subevent IDs, if any.
- Check-in list IDs used by the scanner/team.
- Which item/product IDs count as participants.
- Whether canceled, expired, pending, free, paid, or test orders should count.

Deliverable: a mapping table draft:

```text
website_event_slug | pretix_organizer | pretix_event | pretix_subevent_id | checkin_list_id | tracked_item_ids | notes
```

## 0.2 Pretix auth POC

Run these checks from backend/local scripts, not from the browser:

1. Pretix API token request:
   - Use Pretix API key/token with the expected auth header from Pretix docs.
   - Query one known event orders endpoint.
   - Query one known check-in/check-in-list endpoint.
   - Confirm pagination shape and response fields.

2. Google token direct-to-Pretix test:
   - Send `Authorization: Bearer <google_id_token>` to the same Pretix endpoint.
   - Expected result: `401` or equivalent unauthorized.
   - Treat success as unexpected and inspect whether Pretix has custom OAuth/federation config.

Decision gate:
- If Google token fails direct-to-Pretix, production design must be: browser -> backend with Google token; backend -> Pretix with Pretix API key; backend filters data by authenticated user email.
- If Pretix OAuth can support customer account delegation, document required scopes and implement it as a separate Pretix account-linking flow later. Do not assume Google token reuse.

## 0.3 Counting semantics POC

Validate participant and attended counts for one real event.

Questions to answer:
- Does Pretix orders API expose order positions in list response, or do we need detail calls?
- Which order statuses should count as registered participants?
  - likely include paid/confirmed/free valid orders
  - exclude canceled/expired/test/unpaid unless business wants otherwise
- Should count be orders or order positions?
  - likely order positions because one order can contain multiple participants/tickets
- How do check-ins map to positions?
- Which check-in list is authoritative if multiple lists exist?

Deliverable: one manually verified example:

```text
Event: <site slug>
Pretix event: <organizer>/<event>
Manual registered participant count: N
API registered participant count: N
Manual checked-in count: M
API checked-in count: M
Definition confirmed by: <person/date>
```

## 0.4 Formbricks API POC

Use backend-only `FORMBRICKS_API_KEY`.

Validate the deployed Formbricks version supports one of these documented response-list endpoints:

- `GET /api/v1/management/responses?surveyId={surveyId}` with `x-api-key`
- or `GET /api/v1/surveys/{surveyId}/responses`
- or `GET /api/v1/responses?surveyId={surveyId}`

Confirm:
- pagination parameters and response pagination metadata
- question id -> label mapping availability from survey schema endpoint
- response fields: id, created/submitted timestamp, finished, data object, person/contact metadata if present
- filtering capabilities, if any

Deliverable: exact endpoint contract for the current Formbricks deployment.

## 0.5 Backend instrumentation rules

Add temporary logs only in POC branch or behind env flag like `DEBUG_INTEGRATIONS=true`.

Allowed logs:
- integration name: Pretix/Formbricks
- endpoint category: orders/checkins/responses/surveys
- HTTP status
- elapsed milliseconds
- page count / result count
- sanitized event slug or survey id
- authenticated email hash or domain, if needed

Forbidden logs:
- Pretix API key
- Formbricks API key
- Google token
- full order payloads
- full Formbricks answers
- full attendee/customer PII

## 0.6 Environment variables draft

Preferred location: `jakarta-backend` secrets/env.

```env
PRETIX_API_BASE_URL=https://pretix.example.com
PRETIX_API_TOKEN=secret
PRETIX_ORGANIZER=aws-user-group-jakarta
PRETIX_DEFAULT_CHECKIN_LIST_ID=1

FORMBRICKS_API_URL=https://forms.example.com
FORMBRICKS_API_KEY=secret
FORMBRICKS_WORKSPACE_ID=workspace-id-if-needed

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com
DEBUG_INTEGRATIONS=false
```

Frontend public env remains limited to:

```env
PUBLIC_BACKEND_API_URL=https://jakarta-backend.example.com
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Exit criteria

- Pretix API token works for one event.
- Direct Google token-to-Pretix result is known and documented.
- Count definitions are agreed.
- Formbricks Management API endpoint shape is confirmed.
- Env/secrets location is decided.
