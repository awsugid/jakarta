# Fix Plan — Website Google Auth, Volunteer Multi-Form, Speaker Single-Form

## Goal

Website must support:

1. Volunteer applications: one Formbricks-backed application per volunteer card/division.
2. Speaker applications: one shared Formbricks-backed speaker application form.
3. Google SSO login through Google Identity Services.
4. Authenticated calls to `jakarta-backend` using `Authorization: Bearer <google_id_token>`.

## Current Root Causes

1. Google Sign-In frontend exists, but backend rejects Bearer tokens until JWT validation is implemented.
2. `PUBLIC_GOOGLE_CLIENT_ID` must be set at build/deploy time or GIS button cannot initialize.
3. `PUBLIC_BACKEND_API_URL` must be set or `src/lib/api.ts` falls back to same-origin `/api/...`, which points to the website host, not `jakarta-backend`.
4. Volunteer frontend already expects multiple forms and maps cards to slugs.
5. Speaker frontend currently renders one card per backend speaker form. This conflicts with the new product decision: speaker must use one shared form.
6. Static fallback currently can show Apply buttons even when backend forms are unavailable. This should be avoided for application flows.

## Required environment variables

Set in local `.env` and Cloudflare Pages:

```env
PUBLIC_BACKEND_API_URL=https://jakarta-backend.<your-worker-domain>
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Do not expose backend secrets in website env.

## Website Implementation Plan

### 1. API client stays mostly unchanged

File: `src/lib/api.ts`

Keep:

- `fetchForms(kind?)`
- `fetchDiscovery(kind, slug)`
- `fetchFormLink(kind, slug)`
- `Authorization: Bearer <g_id_token>` header

Add temporary debug auth only if explicitly needed for local dev before backend JWT validation lands:

```env
PUBLIC_DEBUG_USER_EMAIL=dev@example.com
```

If used, add `X-Debug-User-Email` only when `import.meta.env.DEV` is true. Never send it in production builds.

### 2. Google Sign-In loading checklist

Files:

- `src/components/auth/GoogleSignInButton.tsx`
- `src/components/auth/AuthProvider.tsx`
- `src/layouts/Layout.astro`

Keep current GIS script flow:

```text
https://accounts.google.com/gsi/client
```

Fix/verify:

- `PUBLIC_GOOGLE_CLIENT_ID` is defined.
- Google OAuth client has allowed JavaScript origins:
  - production website origin
  - `http://localhost:4321` for dev
- The token is stored in `localStorage['g_id_token']`.
- Backend validates this same Google client ID.

### 3. Volunteer remains multi-form

Files:

- `src/components/volunteer/VolunteerPageContent.tsx`
- `src/components/volunteer/VolunteerRoles.tsx`
- `src/components/volunteer/ApplyVolunteerDialog.tsx`

Keep current model:

- `VolunteerPageContent` calls `fetchForms('volunteer')`.
- `VolunteerRoles` maps static card names to backend slugs.
- Apply flow uses selected card slug:
  - `GET /api/applications/volunteer/:slug`
  - `POST /api/applications/volunteer/:slug/link`

Canonical volunteer slug map:

```ts
{
  Registration: 'registration',
  'FOH (Front of House)': 'foh',
  Logistics: 'logistics',
  Design: 'design',
  Documentation: 'documentation',
  Event: 'event',
  Runner: 'runner',
  'Social Media': 'social-media',
  'Liaison Officer': 'liaison-officer',
  Sponsorship: 'sponsorship',
  'Moderator / MC': 'moderator-mc',
  Website: 'website',
}
```

Fix needed:

- Do not default missing backend form to open for application CTAs.
- If backend forms are unavailable, show static role cards and email subscribe CTA only.
- Only show Apply button when matching backend `form` exists and `form.is_active === true`.

### 4. Speaker changes to single shared form

Files:

- `src/components/speakers/SpeakerPageContent.tsx`
- `src/components/speakers/SpeakerHero.tsx`
- `src/components/speakers/SpeakerBenefits.tsx`
- `src/components/speakers/ApplySpeakerDialog.tsx`

New product rule:

- Speaker uses exactly one backend form:
  - `kind='speaker'`
  - `slug='speaker'`
  - `title='Speaker Application'`

Required frontend behavior:

- `SpeakerPageContent` calls `fetchForms('speaker')`.
- Find the shared speaker form by `slug === 'speaker'`; fallback to first returned speaker form only for backward compatibility.
- Hero Apply button opens:

```ts
handleApply('speaker', speakerForm.title)
```

- `SpeakerBenefits` should not render one Apply button per talk format.
- `SpeakerBenefits` should return to being informational talk-format cards.
- Optional: talk format cards can say users choose talk type inside the speaker application form.
- `ApplySpeakerDialog` stays generic and uses:
  - `GET /api/applications/speaker/speaker`
  - `POST /api/applications/speaker/speaker/link`

### 5. Speaker UI target shape

Page flow:

```text
Load /speakers
  -> GET /api/forms?kind=speaker
  -> use form slug 'speaker'
  -> if active: hero shows Apply as Speaker
  -> benefits show static talk formats only
  -> click Apply
  -> Google SSO if needed
  -> discovery/link endpoints using speaker/speaker
  -> open shared Formbricks speaker form
```

### 6. Dialog behavior

Files:

- `ApplySpeakerDialog.tsx`
- `ApplyVolunteerDialog.tsx`

Current behavior is acceptable for phase 1:

1. Intro.
2. Auth if not signed in.
3. `fetchDiscovery(kind, slug)`.
4. Existing application status or `fetchFormLink(kind, slug)`.
5. Open Formbricks public URL.

Known limitation:

- Duplicate LinkedIn validation is not truly enforced before redirect because LinkedIn is collected inside Formbricks. Solve later with a Formbricks webhook/index or headless form flow if hard prevention is required.

### 7. Website validation checklist

Run from `jakarta-website` with Node 22:

```bash
nvm use 22
bun run build
bunx astro check
```

Manual smoke-test:

1. Open `/volunteer`.
2. Confirm volunteer cards with seeded backend forms show Apply only for active forms.
3. Click one volunteer Apply button.
4. Sign in with Google.
5. Confirm backend calls use `Authorization: Bearer <id_token>`.
6. Confirm returned URL is the matching volunteer Formbricks URL.
7. Open `/speakers`.
8. Confirm only one speaker Apply flow exists and it uses slug `speaker`.
