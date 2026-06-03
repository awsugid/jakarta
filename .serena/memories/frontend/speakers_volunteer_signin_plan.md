# Frontend Integration Plan — Google Sign-In + Speakers/Volunteer API Integration

## Overview

This plan covers integrating the `jakarta-backend` Worker API into the `jakarta-website` Astro frontend for:
1. **Google Sign-In** (authentication system)
2. **`/speakers` page** — dynamic form status + application flow
3. **`/volunteer` page** — dynamic division cards + application flow

## 1. Prerequisites — Environment Variables

Add to `.env.example` and configure in Cloudflare Pages:

```
# Backend API
PUBLIC_BACKEND_API_URL=https://jakarta-backend.awscommunity.id

# Google Sign-In
PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## 2. Google Sign-In System

### 2.1 New Dependencies

```bash
npm install @react-oauth/google  # or use the Google Identity Services script directly
```

### 2.2 New Files

**`src/components/auth/GoogleSignInButton.tsx`** — A "Sign in with Google" button

```tsx
// Renders Google's Sign In button using Google Identity Services
// Props: onSuccess(token), size?, theme?
// Uses window.google.accounts.id.initialize() + renderButton()
// Or uses @react-oauth/google's GoogleLogin component
```

**`src/components/auth/AuthProvider.tsx`** — React context for auth state

```tsx
// Provides: { user: AuthUser | null, isSignedIn: boolean, token: string | null, signIn(), signOut() }
// Stores token in localStorage
// On mount, checks if stored token is still valid
// Exposes methods: signIn(), signOut()
```

**`src/lib/api.ts`** — Backend API client helper

```tsx
// Base fetch wrapper that:
// - Prepends PUBLIC_BACKEND_API_URL to paths
// - Adds Authorization: Bearer <token> header when authenticated
// - Adds X-Debug-User-Email for local dev
// - Handles error responses
// - Export typed functions for each endpoint
```

### 2.3 Types

**`src/lib/types.ts`** — Shared API types

```ts
interface FormInfo {
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  survey_id: string;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
  editable_until: string | null;
}

interface FormStatus {
  form: FormInfo;
  status: "open" | "closed" | "not_yet_open" | "archived";
}

interface DiscoveryResult {
  exists: boolean;
  response_id: string | null;
  finished: boolean | null;
  submitted_email: string | null;
  linkedin_url: string | null;
  editable: boolean;
}

interface ValidationResult {
  ok: boolean;
  code: string | null;
  message: string | null;
}

interface FormLink {
  url: string;
  editable: boolean;
}
```

### 2.4 Modify `src/layouts/Layout.astro`

Wrap `<slot />` with `<AuthProvider client:load>` so auth state is available globally.

### 2.5 Modify `src/components/Header.astro`

- Add a "Sign In" button to the right side of the header (visible on md+).
- When signed in: show user avatar + "Sign Out".
- On mobile: add to MobileNav menu.

## 3. Speakers Page (`/speakers`) — Integration Plan

### 3.1 Current State
- `src/pages/speakers.astro`: Static page with SpeakerHero, SpeakerBenefits (hardcoded talk formats with `isOpen` flags), SpeakerNotify (BillionMail email subscribe).
- No dynamic data from the backend.

### 3.2 Target State

The page flows as follows:

```
Page Load
  → GET /api/forms/speaker → get speaker form(s)
  → If form.status === "open": show "Apply to Speak" CTA button
  → If form.status !== "open": show "Subscribe for Announcements" (current behavior)

User clicks "Apply to Speak":
  → Check if signed in (via AuthProvider context)
  → If NOT signed in: trigger Google Sign-In
  → If signed in:
     → GET /api/applications/speaker/{slug} → check existing application
     → If exists && editable: show "Edit your application" → open FormBricks link
     → If exists && !editable: show "Application Submitted" status
     → If !exists:
        → (Optional) POST /api/applications/speaker/{slug}/validate → check LinkedIn duplicate
        → POST /api/applications/speaker/{slug}/link → get FormBricks URL
        → Redirect user to FormBricks form (external link)
```

### 3.3 Changes

**`SpeakerBenefits.tsx`** → Modify to accept dynamic data:

```tsx
// Accept props: forms: FormStatus[]
// If forms are provided (from backend), render dynamic talk format cards
// Each card shows: title, description, status badge (Open/Closed/Not Yet Open)
// If form is open: show "Apply" button
// If no forms from backend: fallback to current hardcoded talkFormats array
```

**`SpeakerHero.tsx`** → Add conditional CTA:

```tsx
// Accept props: isOpen: boolean, onApply: () => void
// If isOpen: change badge text from "Subscribe..." → "CFP Now Open — Apply Today!"
// Add primary "Apply as a Speaker" button below subtitle
// If !isOpen: keep current "Subscribe" badge/messaging
```

**`CFPForm.tsx` (SpeakerNotify)** → Keep as is for email subscription, but only show when NOT logged in OR when no forms are open.

**New: `ApplySpeakerDialog.tsx`** → Modal/dialog for the application flow:

```tsx
// Step 1: Show form details + "Continue" button
// Step 2: If not authenticated, show Google Sign-In
// Step 3: Check for existing application (GET /api/applications/speaker/{slug})
// Step 4: Show result (existing app status, or proceed to FormBricks link)
```

**`src/pages/speakers.astro`** → Modify to fetch data:

```astro
---
// At build time: pre-fetch forms list? 
// Better: use client:load component that fetches on mount
// Or use Astro's server-side fetch at build time for static data
---

<!-- New: SpeakerApplicationFlow client:load -->
<!-- This wraps the existing components and adds dynamic behavior -->
```

## 4. Volunteer Page (`/volunteer`) — Integration Plan

### 4.1 Current State
- `src/pages/volunteer.astro`: Static page with VolunteerHero, VolunteerRoles (12 hardcoded division cards), VolunteerNotify (BillionMail email subscribe).
- Division cards have no status badges or apply buttons.

### 4.2 Target State

```
Page Load
  → GET /api/forms/volunteer → get all volunteer division forms
  → Map each form to a division card
  → Show status badge per card (Open/Closed/Not Yet Open/Archived)
  → If form is open: show "Apply" button on card

User clicks "Apply" on a division card:
  → Check if signed in
  → If NOT signed in: trigger Google Sign-In
  → If signed in:
     → GET /api/applications/volunteer/{slug} → check existing application
     → If exists && editable: show "Edit your application"
     → If exists && !editable: show "Application Submitted"
     → If !exists:
        → POST /api/applications/volunteer/{slug}/validate → check duplicate LinkedIn
        → POST /api/applications/volunteer/{slug}/link → get FormBricks URL
        → Redirect to FormBricks
```

### 4.3 Changes

**`VolunteerRoles.tsx`** → Modify to accept dynamic data:

```tsx
// Accept props: forms: FormStatus[]
// Merge backend form data with current hardcoded division data (icon, roles, skills, description)
// Each card shows:
//   - Division name, icon, description, roles, skills (existing)
//   - NEW: Status badge (Open/Closed/Not Yet Open)
//   - NEW: "Apply" button if status === "open"
// If no forms from backend: fallback to current hardcoded static display
```

**`VolunteerHero.tsx`** → Add conditional messaging:

```tsx
// Accept props: openCount: number (how many divisions are open)
// If openCount > 0: change badge "Subscribe..." → "{openCount} Division(s) Open — Apply Now!"
// Add "Browse Open Roles" CTA button that scrolls to VolunteerRoles
// If openCount === 0: keep current "Subscribe" messaging
```

**`VolunteerNotify.tsx`** → Keep as is (email subscription fallback).

**New: `ApplyVolunteerDialog.tsx`** → Similar to speaker dialog but for volunteer divisions.

**`src/pages/volunteer.astro`** → Modify to fetch data + pass to components.

## 5. Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Add Google Client ID to env vars | `.env.example`, Cloudflare Pages vars |
| 2 | Create `src/lib/types.ts` | New file |
| 3 | Create `src/lib/api.ts` — API client | New file |
| 4 | Create `src/components/auth/AuthProvider.tsx` | New file |
| 5 | Create `src/components/auth/GoogleSignInButton.tsx` | New file |
| 6 | Wrap Layout with AuthProvider | `src/layouts/Layout.astro` |
| 7 | Add Sign-In button to Header | `src/components/Header.astro` |
| 8 | Create `src/components/speakers/ApplySpeakerDialog.tsx` | New file |
| 9 | Update `SpeakerHero.tsx` — dynamic CTA | Modify |
| 10 | Update `SpeakerBenefits.tsx` — dynamic form cards | Modify |
| 11 | Update `src/pages/speakers.astro` — wire everything | Modify |
| 12 | Create `src/components/volunteer/ApplyVolunteerDialog.tsx` | New file |
| 13 | Update `VolunteerHero.tsx` — dynamic CTA | Modify |
| 14 | Update `VolunteerRoles.tsx` — dynamic status + apply buttons | Modify |
| 15 | Update `src/pages/volunteer.astro` — wire everything | Modify |

## 6. Backend Considerations (to coordinate with backend team)

### 6.1 JWT Validation
The backend currently returns 401 for Bearer tokens with "JWT validation not yet implemented". The frontend must be ready for this. Two approaches:

**Approach A (Recommended)**: Implement Google JWT validation in the backend Worker before frontend goes live. Frontend sends `Authorization: Bearer <google_id_token>` and backend validates it.

**Approach B (Fallback)**: Frontend sends `X-Debug-User-Email` header with the Google email (dev mode only, not for production).

### 6.2 Backend URL
The backend Worker needs a public URL. Current `wrangler.toml` has no `workers_dev` or route configured. Need to deploy with a custom domain or `workers.dev` subdomain.

### 6.3 CORS
Backend `ALLOWED_ORIGINS` must include the frontend domain (currently set to `https://jakarta.awscommunity.id`). For local dev, add `http://localhost:4321`.

### 6.4 D1 Seeding
The `application_forms` D1 table must be seeded with entries for each speaker talk format and volunteer division. Example seed:

```sql
INSERT INTO application_forms (id, kind, slug, title, description, formbricks_survey_id, formbricks_public_url, email_question_id, linkedin_question_id, is_active, display_order)
VALUES 
-- Speaker forms (one per talk format)
('spkr-standard', 'speaker', 'standard-talk', 'Standard Talk', '30-45 minute technical deep dive', 'cm0000001', 'https://forms.awscommunity.id/surveys/cm0000001', 'q-email', 'q-linkedin', 1, 1),
-- Volunteer forms (one per division)
('vol-foh', 'volunteer', 'foh', 'FOH (Front of House)', 'Multimedia operator and slide controller', 'cm0000010', 'https://forms.awscommunity.id/surveys/cm0000010', 'q-email', 'q-linkedin', 1, 1),
-- ... etc
```

## 7. Fallback Strategy

If the backend is unreachable or returns errors, the frontend gracefully degrades:
- **Speakers**: Falls back to hardcoded `talkFormats` array + BillionMail email subscription (current behavior).
- **Volunteer**: Falls back to hardcoded `divisions` array + BillionMail email subscription (current behavior).
- **Sign-In**: If Google Identity Services fails to load, show plain "email sign-in" fallback or hide the auth-dependent features.
