# Phase 3 — Internal Formbricks Admin Dashboard

Goal: build an internal dashboard restricted to admin emails from env vars, showing granular Formbricks submission data. Desktop view is prioritized first.

## Dependencies

Must complete before this phase ships:
- Phase 0 CORS fix for authenticated/PII endpoints.
- Phase 0 admin guard helper.
- Remove/gate raw Formbricks response logging.
- Protect existing `/api/admin/*` maintenance routes with the same admin guard.

## Existing backend capabilities to reuse

`jakarta-backend` already has Formbricks Management API integration:

- `src/formbricks/client.rs`
  - `list_responses(survey_id, limit, offset)`
  - `get_all_responses(...)`
  - `get_response(id)`
  - `get_survey(id)`
- `src/formbricks/types.rs`
  - response list and metadata types
  - survey types supporting legacy `questions[]` and newer `blocks[].elements[]`
  - question headline text extraction / HTML stripping
- `src/formbricks/responses.rs`
  - answer extraction helpers
- Existing routes already expose some form/schema/application behavior for speaker/volunteer flows.

Do not rebuild the Formbricks client. Wire these existing methods behind admin-only endpoints and normalize the response for the frontend.

## Backend config

Add to `AppConfig`:

```text
admin_emails: Vec<String>
```

Env:

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Helper:

```text
is_admin(email): lowercase(trim(email)) in admin_emails
require_admin(req): extract_user(req) + is_admin(user.email)
```

Response behavior:
- 401 for missing/invalid Google token.
- 403 for authenticated non-admin.

## Backend endpoints

### Current admin identity

```http
GET /api/admin/me
Authorization: Bearer <google_id_token>
```

Response:

```ts
interface AdminMe {
  email: string;
  name?: string;
  picture?: string;
  is_admin: true;
}
```

### List manageable forms/surveys

```http
GET /api/admin/forms
Authorization: Bearer <google_id_token>
```

Use existing D1 `application_forms` mapping first so admin dashboard aligns with speaker/volunteer application forms.

Response:

```ts
interface AdminFormSummary {
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  survey_id: string;
  is_active: boolean;
  response_count: number | null;
}
```

### List Formbricks responses

```http
GET /api/admin/formbricks/responses?surveyId=...&limit=50&offset=0&finished=all|true|false&from=...&to=...&search=...
Authorization: Bearer <google_id_token>
```

Use offset/limit because the existing Formbricks client and Management API expose offset pagination.

Response:

```ts
interface AdminFormbricksResponseList {
  items: AdminFormbricksResponseSummary[];
  total: number | null;
  limit: number;
  offset: number;
}

interface AdminFormbricksResponseSummary {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  updated_at: string | null;
  finished: boolean;
  respondent_email: string | null;
  respondent_name: string | null;
  preview_answers: Record<string, string | number | boolean | string[] | null>;
}
```

### Response detail

```http
GET /api/admin/formbricks/responses/:responseId?surveyId=...
Authorization: Bearer <google_id_token>
```

Response:

```ts
interface AdminFormbricksResponseDetail {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  updated_at: string | null;
  finished: boolean;
  answers: Array<{
    question_id: string;
    label: string;
    type: string;
    value: unknown;
  }>;
  metadata: {
    contact_id?: string;
  };
}
```

Do not include raw response payload by default. If a raw debug view is needed, gate behind both admin auth and `DEBUG_INTEGRATIONS=true`.

## Data normalization

Backend should map Formbricks question IDs to labels using survey schema.

Rules:
- Use survey `blocks[].elements[]` first, fallback to legacy `questions[]`.
- Strip HTML from question headlines.
- Preserve question ID as secondary metadata, not primary display label.
- For arrays, show badges or comma-separated strings.
- For URLs/files, render safe links in the detail panel.
- For unknown objects, render formatted JSON in detail view only.

## Frontend route/components

Add route:

```text
src/pages/admin/index.astro
```

Add components:

```text
src/components/admin/AdminDashboard.tsx
src/components/admin/AdminGuard.tsx
src/components/admin/FormSelector.tsx
src/components/admin/FormbricksResponsesTable.tsx
src/components/admin/ResponseDetailDrawer.tsx
src/components/admin/AdminStatsCards.tsx
```

Add API helpers/types:

```text
src/lib/api.ts
src/lib/types.ts
```

Add admin link in:

```text
src/components/auth/UserMenu.tsx
```

Important: show the admin menu item only after `GET /api/admin/me` confirms admin. Client-side email checks are UX only, not security.

## Desktop-first UI

Desktop layout:

1. Header row
   - Dashboard title
   - signed-in admin email
   - refresh button

2. Filter row
   - form selector
   - date range
   - finished/all filter
   - search input, if backend supports efficient search

3. Stats cards
   - total responses
   - finished responses
   - unfinished responses
   - latest submission

4. Main table
   - submitted at
   - form title
   - respondent email/name if available
   - finished status
   - selected preview answer columns
   - action: View detail

5. Detail drawer/dialog
   - all answers with labels
   - metadata
   - copy response id

Mobile for MVP:
- Must remain usable.
- Horizontal table scroll is acceptable for first phase.
- Full mobile card redesign can be Phase 4.

## Security/privacy rules

- Formbricks API key stays backend-only.
- Admin data never comes from Astro static build.
- Every admin endpoint calls `require_admin`.
- No full response bodies in logs.
- No browser access to Formbricks Management API key.
- CORS limited to trusted website origins.
- Optional export endpoint must use same admin guard.

## Validation

Backend:
- `/api/admin/me`: 401 without token, 403 non-admin, 200 admin.
- response list: 403 non-admin.
- Formbricks API failure normalization.
- no raw body logging.

Frontend:
- non-signed-in user sees sign-in prompt or access denied.
- signed-in non-admin sees access denied.
- admin can list forms, filter responses, open details.
- desktop table layout usable.

Website commands:

```bash
nvm use 22
bun run build
bunx astro check
```

## Exit criteria

- Admin-only dashboard lists Formbricks responses for configured surveys.
- Admin can inspect granular answers in desktop view.
- Non-admins cannot access data through UI or direct API calls.
- Formbricks API key and raw response payloads are not exposed to the browser/logs.
