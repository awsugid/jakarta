# Memory: Formbricks Admin Responses Pagination & Total Analysis

## Date: 2026-09-16

## Key Findings & Architecture

### Backend (`jakarta-backend/src/http/admin.rs`)
- `GET /api/admin/formbricks/responses` accepts `surveyId`, `limit`, `offset`, `finished`.
- `total` returned in JSON is extracted directly from Formbricks API `list.meta.total` (unfiltered total responses for the survey).
- Category filter (`finished=true|false`) is applied in-memory AFTER fetching a page from Formbricks.
- Consequently:
  - `total` is always the unfiltered survey count (e.g., 100) even when filtering by `finished=true` or `finished=false`.
  - Filtering in-memory per page breaks pagination offset boundaries.

### Frontend (`src/components/admin/`)
- `AdminDashboard.tsx` fetches page 1 (`limit: 50, offset: 0`).
- `AdminStatsCards.tsx` displays `Total` from backend `data.total`, while `Finished` and `In Progress` are computed client-side from `responses.filter(...)` (only counting current page items, max 50).
- `FormbricksResponsesTable.tsx` does not have pagination controls (Next/Previous buttons or page numbers).

## Recommended Solution
1. Update backend `handle_admin_responses` to calculate accurate total counts (either filtered total or detailed `finished_total` & `in_progress_total`) and paginate over filtered records.
2. Update `AdminStatsCards.tsx` to use dataset-wide totals from API meta.
3. Add pagination UI controls to `FormbricksResponsesTable.tsx` and manage `offset` / `page` state in `AdminDashboard.tsx`.
