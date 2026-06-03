# User Dropdown and My Applications Implementation Context

## Task Description
Implement the frontend user dropdown and application list on the AWS User Group Jakarta website, including changing the navbar active highlight to AWS Yellow.

## Navbar Active Color Update
- Changed active highlight from `text-yellow-400` to `text-primary` in `jakarta-website/src/components/Header.astro` and `jakarta-website/src/components/MobileNav.tsx`.

## Backend Endpoints Needed
1. `GET /api/applications/summary`
2. `GET /api/applications/:kind/:slug/response`
3. `POST /api/applications/:kind/:slug/link` (extended to support edit mode via `?mode=edit`)

## Frontend Components to Implement / Update
1. `jakarta-website/src/components/auth/UserMenu.tsx` (using shadcn's `DropdownMenu`, `Avatar`, `Separator`)
2. `jakarta-website/src/components/auth/HeaderAuth.tsx` (incorporate `UserMenu`)
3. `jakarta-website/src/components/application/ApplicationStatusModal.tsx` (for viewing full response key-value pairs)
4. Update `ApplyVolunteerDialog.tsx` & `ApplySpeakerDialog.tsx` or create a generic modal for prefilled iframe.
