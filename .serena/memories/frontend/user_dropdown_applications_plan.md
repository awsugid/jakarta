# User Dropdown + My Applications — Frontend Plan

## Feature Overview

When a user is signed in with Google, the Header shows an avatar button that opens a dropdown menu. The dropdown displays the user's profile info, a list of all their submitted applications (volunteer/speaker), and a Sign Out option. Each application entry has View and/or Edit actions depending on `editable_until` policy.

## UI Structure

```
Header
└── Avatar button (Google profile photo or initials fallback)
    └── DropdownMenu (shadcn)
        ├── user@gmail.com + display name (read-only)
        ├── ─────────────────────────────
        ├── My Applications
        │   ├── 🟢 FOH Volunteer    [View] [Edit]   ← finished + editable
        │   ├── 🔵 Speaker          [View]           ← finished, not editable
        │   └── Empty state: "No applications yet"
        ├── ─────────────────────────────
        └── Sign Out
```

## Component Location

```
src/components/
└── auth/
    ├── UserMenu.tsx        ← avatar button + dropdown, React client component
    ├── AuthProvider.tsx    ← Google auth context/state provider
    └── useAuth.ts          ← hook exposing { user, token, signIn, signOut }
```

`Header.astro` replaces its current Sign-In placeholder with:
```astro
<UserMenu client:load />
```

## Auth State

- Use React context in `AuthProvider.tsx` — wraps the part of the page that needs auth state.
- Store: `{ user: GoogleUser | null, token: string | null }`.
- `GoogleUser`: `{ email, name, picture, sub }`.
- Token is the Google ID token (JWT), sent as `Authorization: Bearer <token>` to backend.
- Persist token in `sessionStorage` (not localStorage) — clears on tab close, acceptable for community site.
- On page load: check `sessionStorage` for existing token, validate expiry, restore state if valid.

## Google Sign-In Integration

- Use Google Identity Services (`accounts.google.com/gsi/client`) script.
- Load via `<Script>` in `Layout.astro` or lazy-load in `AuthProvider.tsx`.
- `google.accounts.id.initialize({ client_id, callback })` → callback receives credential (ID token).
- Decode JWT payload client-side (base64 split, no verification) to get `email`, `name`, `picture`.
- Store raw token for backend calls.

## My Applications Data

On dropdown open (not on page load — lazy fetch):
```
GET /api/applications/summary
Authorization: Bearer <google-id-token>
```

Response shape:
```json
[
  {
    "kind": "volunteer",
    "slug": "foh",
    "title": "FOH (Front of House)",
    "finished": true,
    "editable": true,
    "submitted_at": "2026-05-01T10:00:00Z"
  },
  {
    "kind": "speaker",
    "slug": "speaker",
    "title": "Speaker Application",
    "finished": true,
    "editable": false,
    "submitted_at": "2026-04-15T08:30:00Z"
  }
]
```

- Show loading skeleton while fetching.
- Show empty state if array is empty.
- Cache result in component state for the session — do not re-fetch on every dropdown open.

## View Action

- Opens a read-only summary modal showing the user's submitted answers.
- Backend: `GET /api/applications/:kind/:slug` already returns `exists`, `finished`, `submitted_email`, `linkedin_url`.
- For full answer display: backend proxies `GET /api/v2/management/responses/:responseId` → returns `data` map.
- Frontend renders key-value pairs of question label → answer (labels fetched from form structure).

## Edit Action

Only shown when `editable: true` (backend enforces `editable_until` policy).

Edit flow:
1. Frontend calls `POST /api/applications/:kind/:slug/link?mode=edit`.
2. Backend fetches existing response data from FormBricks.
3. Backend builds prefilled FormBricks URL:
   ```
   https://<formbricks>/s/<surveyId>?<questionId1>=<answer1>&<questionId2>=<answer2>&skipPrefilled=true
   ```
4. Returns `{ url, editable: true }`.
5. Frontend opens iframe in modal — same component as new application flow.
6. User re-submits → FormBricks creates new response.
7. Webhook fires `responseFinished` → backend detects same email → deletes old response.

## Apply Flow (from /volunteer or /speakers page)

Triggered when user clicks "Apply" on a form card. Uses the same auth state.

```
1. Check auth → prompt Sign-In if not authenticated
2. GET /api/applications/:kind/:slug → exists? show existing application
3. POST /api/applications/:kind/:slug/link → get iframe URL
4. Open ApplicationModal with <iframe src={url} />
5. Show "Thank you" message after user closes modal
```

## ApplicationModal Component

```
src/components/
└── application/
    ├── ApplicationModal.tsx   ← modal wrapper with iframe
    └── ApplicationStatus.tsx  ← read-only view of existing application
```

- Uses shadcn `Dialog` component.
- iframe: `w-full h-[600px] border-0 rounded-lg`.
- No postMessage from cross-origin iframe — show static "Thank you, we'll confirm shortly" on close.
- Mobile: full-screen sheet instead of dialog (`Sheet` from shadcn).

## Status Indicators (dropdown list)

| State | Indicator | Actions |
|---|---|---|
| `finished: true, editable: true` | 🟢 green dot | View, Edit |
| `finished: true, editable: false` | 🔵 blue dot | View |
| `finished: false` | 🟡 yellow dot | Continue (Edit) |

## Styling Notes

- Follow existing dark-mode-first convention (`<html class="dark">` hardcoded).
- Use token classes: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Avatar button: 36px circle, `ring-2 ring-primary` on hover.
- Dropdown: shadcn `DropdownMenu` — already available if added via `npx shadcn@latest add dropdown-menu`.
- Application list items: `flex items-center justify-between gap-2 py-2`.
- Mobile: dropdown becomes a bottom `Sheet` for better tap targets.

## Dependencies to Add

- `@react-oauth/google` OR raw Google Identity Services script — check `package.json` before adding.
  - Prefer raw GSI script if `@react-oauth/google` is not already present (avoids extra bundle).
- shadcn components: `dropdown-menu`, `dialog`, `sheet`, `skeleton`, `avatar` — add via `npx shadcn@latest add <name>`.

## Implementation Sequence

1. Add Google GSI script to `Layout.astro`.
2. Implement `AuthProvider.tsx` + `useAuth.ts`.
3. Implement `UserMenu.tsx` with skeleton dropdown (no applications list yet).
4. Wire `UserMenu` into `Header.astro` with `client:load`.
5. Implement `ApplicationModal.tsx` for iframe embed.
6. Wire Apply button on `/volunteer` and `/speakers` pages through auth → modal flow.
7. Add My Applications list to `UserMenu` — fetch `/api/applications/summary` on dropdown open.
8. Implement `ApplicationStatus.tsx` for View modal.
9. Wire Edit action → prefilled iframe flow.

## Out of Scope (Phase 1)

- Email notification when application is accepted/rejected.
- Admin-facing application review UI.
- Application deletion by user.
- Multiple applications per kind (one per kind/slug per user only).
