# Phase 3 — Internal Formbricks Admin Dashboard

Goal: add an internal dashboard restricted to admin emails from env vars. It should pull Formbricks submission data through backend APIs and show granular response data. Desktop is prioritized first.

## Current project context

Existing website already has:
- Google Identity Services auth in `src/components/auth/AuthProvider.tsx`
- API helpers in `src/lib/api.ts`
- types in `src/lib/types.ts`
- user applications dashboard in `src/components/auth/UserApplicationsDashboard.tsx`
- Formbricks-related application flow through `jakarta-backend`

Existing backend memories indicate Formbricks Management API is already treated as backend-only and D1 maps application forms to Formbricks survey IDs.

## Backend admin guard

Preferred in `jakarta-backend`.

For every `/api/admin/*` endpoint:
1. Require `Authorization: Bearer <google_id_token>`.
2. Validate Google ID token signature, issuer, audience, expiration.
3. Require `email_verified === true`.
4. Normalize email with lowercase + trim.
5. Check email in comma-separated env var:

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Return:
- `401` if not authenticated / invalid token
- `403` if authenticated but not admin

Frontend hiding admin links is only UX; backend allowlist is the security control.

## Formbricks API use

Docs show Management API response/survey endpoints requiring API key. Use backend-only env:

```env
FORMBRICKS_API_URL=https://forms.example.com
FORMBRICKS_API_KEY=secret
FORMBRICKS_WORKSPACE_ID=workspace-id-if-needed
```

Potential endpoint variants to verify in Phase 0:
- `GET /api/v1/management/responses?surveyId={surveyId}` with `x-api-key`
- `GET /api/v1/surveys/{surveyId}/responses`
- `GET /api/v1/responses?surveyId={surveyId}`
- survey schema endpoint such as `GET /api/v1/management/surveys/{surveyId}`

Backend should normalize whichever deployed-version response shape exists into one stable website contract.

## Backend endpoints

```http
GET /api/admin/me
```

Returns current authenticated admin profile:

```ts
interface AdminMe {
  email: string;
  name?: string;
  picture?: string;
  is_admin: true;
}
```

```http
GET /api/admin/forms
```

Returns forms/surveys available to inspect. Prefer using existing D1 `application_forms` mapping first.

```ts
interface AdminFormSummary {
  kind: string;
  slug: string;
  title: string;
  survey_id: string;
  is_active: boolean;
  response_count?: number;
}
```

```http
GET /api/admin/formbricks/responses?surveyId=...&page=1&pageSize=50&finished=all&from=...&to=...&search=...
```

Returns paginated normalized responses:

```ts
interface AdminFormbricksResponseList {
  items: AdminFormbricksResponseSummary[];
  page: number;
  page_size: number;
  total: number | null;
  next_cursor: string | null;
}

interface AdminFormbricksResponseSummary {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  finished: boolean;
  respondent_email: string | null;
  respondent_name: string | null;
  preview_answers: Record<string, string | number | boolean | string[] | null>;
}
```

```http
GET /api/admin/formbricks/responses/:responseId?surveyId=...
```

Returns full normalized detail:

```ts
interface AdminFormbricksResponseDetail {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  finished: boolean;
  answers: Array<{
    question_id: string;
    label: string;
    type: string;
    value: unknown;
  }>;
  raw_allowed_debug?: unknown; // only behind DEBUG_INTEGRATIONS and never by default
}
```

Optional later:

```http
GET /api/admin/formbricks/export.csv?surveyId=...
```

## Frontend routes/components

Add route:

```text
src/pages/admin/index.astro
```

Add React island:

```text
src/components/admin/AdminDashboard.tsx
```

Possible subcomponents:

```text
src/components/admin/AdminGuard.tsx
src/components/admin/FormSelector.tsx
src/components/admin/FormbricksResponsesTable.tsx
src/components/admin/ResponseDetailDrawer.tsx
src/components/admin/AdminStatsCards.tsx
```

Add API helpers/types in:

```text
src/lib/api.ts
src/lib/types.ts
```

Add admin menu entry in `src/components/auth/UserMenu.tsx` only after `GET /api/admin/me` confirms admin. Do not rely on client-side email checks alone.

## Desktop-first UI shape

Desktop priority:
- Top bar: title, signed-in admin email, refresh button.
- Filters row:
  - form/survey selector
  - date range
  - finished/all filter
  - search by email/text if backend supports it
- Stats cards:
  - total responses
  - finished responses
  - unfinished responses
  - latest submission time
- Main table:
  - submitted at
  - form title
  - respondent email/name if available
  - finished status
  - selected key answers as columns
  - action: View detail
- Detail drawer/dialog:
  - all answers with labels
  - metadata
  - copy response ID

Mobile can be acceptable but not optimized in this phase:
- table may horizontally scroll
- detail drawer remains usable
- full mobile card redesign can be Phase 4

## Data normalization

Backend should map Formbricks question IDs to labels using survey schema.

If schema is unavailable:
- fallback labels: `Question 1`, `Question 2`, etc.
- do not expose confusing raw ids as primary labels unless needed in secondary muted text

For values:
- string/number/boolean shown as text
- arrays joined with comma or badges
- files/URLs shown as safe links if present
- unknown objects rendered in detail view as formatted JSON only for admins

## Security checklist

- Formbricks API key stays in backend only.
- `/api/admin/*` rejects non-admin emails server-side.
- CORS only allows website origins already configured by backend.
- No raw secrets in logs.
- Avoid logging full responses; log counts/status only.
- Consider audit log for admin access in later phase.

## Performance plan

Phase 3A:
- live Formbricks API fetch with pagination
- cache survey schema labels for short TTL

Phase 3B:
- cache response summaries in D1 if dashboard is slow
- update cache via Formbricks webhook or scheduled sync
- add CSV export generated server-side

## Validation

Backend:
- 401 without token
- 403 for authenticated non-admin
- 200 for env allowlisted admin
- Formbricks API error normalization

Frontend:
- admin sees dashboard
- non-admin sees access denied
- expired token signs out or prompts re-login
- desktop table and detail drawer usable
- build/check:
  - `nvm use 22`
  - `bun run build`
  - `bunx astro check`

## Exit criteria

- Admin-only dashboard lists Formbricks responses for configured surveys.
- Admin can inspect granular answers in desktop view.
- Non-admins cannot access data even if they call APIs manually.
- Formbricks API key never reaches the browser.
