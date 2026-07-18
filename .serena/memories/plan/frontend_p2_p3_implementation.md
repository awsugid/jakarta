# Frontend Phase 2 + Phase 3 Implementation Summary

Status: implemented and validated (`bun run build` clean; `astro check` flags only pre-existing unrelated errors in `test-schedule.astro` and `VolunteerRoles.tsx`).

## Files changed

- `src/lib/types.ts` — appended Phase 2 (`UserPretixOrderSummary`, `UserPretixOrdersResponse`) and Phase 3 (`AdminMe`, `AdminFormSummary`, `AdminFormbricksResponseSummary`, `AdminFormbricksResponseList`, `AdminFormbricksAnswer`, `AdminFormbricksResponseDetail`) types.
- `src/lib/api.ts` — appended `fetchUserPretixOrders`, `fetchAdminMe`, `fetchAdminForms`, `fetchAdminFormbricksResponses`, `fetchAdminFormbricksResponseDetail`. Extended import block. Dropped `UserPretixOrderSummary` from import (only the response wrapper type is referenced in this file; unused import triggered strict warning).
- `src/components/auth/UserMenu.tsx` — added `useEffect` admin probe (`fetchAdminMe`, never throws on 403); inserted "My Event Orders" (`/orders`, Ticket icon) after "My Applications" and conditional "Admin Dashboard" (`/admin`, Shield icon) after that, in BOTH desktop dropdown and mobile sheet.

## Files created

### Phase 2
- `src/components/auth/UserPretixOrdersDashboard.tsx` — wraps in `AuthProvider`; sign-in-required card via `GoogleSignInButton`; 401 → `signOut()` + re-login card; loads `fetchUserPretixOrders({ limit: 50 })`; mobile cards + `md:` table; status badge colors (paid green, canceled red, pending/expired yellow, else muted); loading skeleton; retry; empty state. Token classes only.
- `src/pages/orders.astro` — page mounting `UserPretixOrdersDashboard client:load`.

### Phase 3 (new folder `src/components/admin/`)
- `AdminGuard.tsx` — `AdminGuard` wraps children with render-prop `(admin) => node`. States: loading skeleton, signed-out (GoogleSignInButton card), forbidden (ShieldX card), ok. 401 → `signOut()` + signed-out; 403 → forbidden; no throw.
- `FormSelector.tsx` — `Select` populated by `fetchAdminForms()`; defaults to first active (or first) form if caller passes `value=null`. Shows kind + title, marks archived.
- `AdminStatsCards.tsx` — 4 cards (Total, Finished, In Progress, Latest Submission). `grid-cols-2 md:grid-cols-4`.
- `FormbricksResponsesTable.tsx` — desktop `Table` (Submitted, Respondent, Status, Preview, Action) with row click `onSelect`; mobile stacked cards. Truncates preview answers.
- `ResponseDetailDrawer.tsx` — right-side `Sheet`; fetches detail via `fetchAdminFormbricksResponseDetail`; per-answer render (badge type, multiline pre for long/JSON), copy response-id button, contact_id metadata.
- `AdminDashboard.tsx` — orchestrator under `AdminGuard`; header (title + admin email + refresh), filter row (`FormSelector` + finished `Select`), `AdminStatsCards`, table/drawer; `useEffect` refetch on filter change.
- `src/pages/admin/index.astro` — page mounting `AdminDashboard client:load`.

## Routes added
- `/orders`
- `/admin`

## Validation
- `nvm use 22 && bun run build` → SUCCESS, 20 pages generated including `/orders/index.html` and `/admin/index.html`. Build wrapper reported exit 2 due to shell quirk ("Cannot set tty process group") but Astro reported `Complete!`.
- `bunx astro check` → all errors are pre-existing in `src/pages/test-schedule.astro` (HTMLElement casting) and warnings in `VolunteerRoles.tsx`. No new errors from this work.

## Notes / conventions followed
- Every new `.tsx` starts with `"use client"`.
- Import order: third-party, `@/` alias, relative.
- Tailwind token classes only; dark-mode first; mobile-first.
- `cn()` used for conditional classes.
- shadcn primitives reused: button, card, badge, dialog, sheet, dropdown-menu, select, table, avatar.
- No new dependencies added.
- No backend files touched.
- Not committed, not pushed, no long-running dev server started.

## Known follow-ups (not done, out of scope)
- Phase 3 memory mentions optional search/date-range filter params (`from`, `to`, `search`) in API contract — backend contract given to frontend only lists `finished` filter; only `finished` implemented in UI. Add when backend exposes them.
- Pagination UI for responses beyond first 50 not built (offset/limit wired in api helper but dashboard always uses offset=0). Add when needed.
