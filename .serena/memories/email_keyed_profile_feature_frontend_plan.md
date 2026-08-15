# Email-keyed Profile Feature — Frontend Plan (planning only, no source edited)

(Supersedes placement: lives top-level because `.serena/memories/plan/` is root-owned.)

## Current implemented state (verified)

### Frontend (jakarta-website)
- `src/components/people/PeopleList.tsx` — `PeopleList` (default + named export).
  - Props: `PeopleListProps { groups: PeopleGroup[] }`; `PeopleGroup { label, people: PersonItem[] }`; `PersonItem { email, fallbackName?, role?, linkedin?, github? }`.
  - Fetch: `fetchProfilesLookup(allEmails)` in `useEffect`; builds `profilesMap` keyed by `normalized_email`.
  - Name: `getDisplayName` chain = OAuth `profile.name` → `person.fallbackName` → email username → `"Community Member"`.
  - Avatar: `profile.picture` w/ onError fallback → initials via `getInitials` → `User` icon.
  - Role: `person.role` || heuristic `"Community Contributor"/"Community Volunteer"` via `oauthNameMatches`.
  - Links: `person.linkedin` / `person.github` from STATIC page config only; absent → disabled placeholder buttons (violates "missing links render nothing").
- `src/lib/profiles-api.ts` — `Profile { normalized_email, name?, picture?, updated_at }`; `fetchProfilesLookup(emails)` → POST `/api/profiles/lookup`, batches of 50, dedupes + lowercases.
- `src/lib/api.ts` — `apiFetch` (base `PUBLIC_BACKEND_API_URL`), `authHeaders()` (Bearer `g_id_token` from localStorage, debug email headers).
- Page integration: `src/pages/comday-26.astro` — `peopleGroups` const in frontmatter (2 hard-coded people, no links); `<PeopleList client:visible groups={peopleGroups} />` in `#team` section. Roster config stays at consuming page (per Workstream C decision).
- User UI: `src/components/auth/UserMenu.tsx` shows Google `user.name/picture/email` from `useAuth()`; NO self-service profile editor exists. Admin `/admin` LinkManager is a separate Linktree feature (link_page/link_items tables) — not the people profile.
- Tests: none. `package.json` has no test script.

### Backend (jakarta-backend) — dependency, out of frontend scope
- `src/http/profiles.rs` `handle_profiles_lookup`: public POST, max 50 emails; side-effect upserts requester snapshot from Google token.
- `src/storage/d1.rs` `ProfileRepository::{upsert_profile, lookup_profiles}`.
- `migrations/0005_profiles.sql`: `profiles(normalized_email PK, name, picture, updated_at)` — NO title, NO links.

## Gap
Profile has no `title` and no social links; PeopleList links come from static config and render disabled placeholders; no user-facing editor.

## Frozen contract (freeze BEFORE agents start; any change = re-freeze)

```ts
// src/lib/profiles-api.ts (Agent B owns file)
export interface ProfileLink {
  kind: "linkedin" | "github" | "instagram" | "website" | "x" | "other";
  url: string;   // absolute https URL
  label?: string;
}
export interface Profile {
  normalized_email: string;
  name?: string | null;      // Google-owned, never edited by user
  picture?: string | null;   // Google-owned
  title?: string | null;     // user-set, e.g. "Cloud Engineer"
  links?: ProfileLink[] | null;
  updated_at: string;
}
```

Endpoints (backend dependency, additive):
- `POST /api/profiles/lookup` — response rows gain `title`, `links` (additive → old consumers unaffected).
- `GET /api/profiles/me` (Bearer) → `Profile`.
- `PUT /api/profiles/me` (Bearer) body `{ title?: string|null, links?: ProfileLink[]|null }` → `Profile`. Backend validates URL scheme + caps (e.g. ≤10 links) at trust boundary. `name`/`picture` NOT editable — stay Google-snapshot owned.

## Tasks / parallel agents (disjoint write scopes)

### Phase 0 — contract freeze + backend (Agent A, serial first; repo jakarta-backend)
Files (only agent touching backend):
- `migrations/0006_profile_details.sql` — `ALTER TABLE profiles ADD COLUMN title TEXT; ADD COLUMN links TEXT;` (links = JSON string).
- `src/storage/d1.rs` — extend `Profile` struct serde, `lookup_profiles` SELECT, add `update_profile_details(db, email, title, links)`.
- `src/http/profiles.rs` — `handle_my_profile_get`, `handle_my_profile_put` (`require_user`); extend lookup SELECT.
- `src/http/routes.rs` — register `GET/PUT /api/profiles/me`.
Back-compat: all additive; upsert_profile untouched (COALESCE snapshot behavior preserved).

### Phase 1 — frontend, three agents in parallel (all in jakarta-website)

Agent B — API + editor (owns `src/lib/profiles-api.ts`):
- Extend types per frozen contract; add `fetchMyProfile()`, `updateMyProfile(input)`.
- NEW `src/pages/profile.astro` — thin page, `<ProfileEditor client:load />`.
- NEW `src/components/profile/ProfileEditor.tsx` — mobile-first Card: read-only name/email/picture (from `useAuth`), Input for title, links list (Select kind + Input url, add/remove rows), Save → PUT, success/error states. Use existing shadcn ui primitives; `type="url"` inputs; no new deps.

Agent C — rendering (owns `src/components/people/PeopleList.tsx`):
- `displayTitle = profile?.title || person.role || "Community Volunteer"`.
- Links: `const links = profile?.links?.length ? profile.links : [{kind:"linkedin",url:person.linkedin},{kind:"github",url:person.github}].filter(l=>l.url)` — back-compat bridge; page config links still honored until roster migrated.
- Render only present links (icon map: linkedin/github/instagram/website/x/other via lucide `Linkedin/Github/Instagram/Globe/AtSign/Link`); DELETE disabled placeholder spans; empty links row → render nothing.
- Does NOT edit profiles-api.ts — imports `type ProfileLink` per frozen contract.

Agent D — navigation (owns `src/components/auth/UserMenu.tsx` only):
- Add "My Profile" `/profile` item (desktop DropdownMenuItem + mobile Sheet Button), `UserCircle2` icon, placed above "My Applications".

Dependencies: B needs Phase 0 contract only (build against it; manual test vs deployed backend later). C needs Phase 0 lookup payload + B's type export (parallel-safe: import path fixed by contract; merge order B→C for typecheck). D fully independent.

## Integration sequencing (post-merge, single integrator)
1. Merge A (backend) → deploy staging.
2. Merge B, C, D (disjoint files → no conflicts).
3. Integrator owns validation: `nvm use 22 && bun run build && bunx astro check` (ignore pre-existing `functions/api/subscribe.ts` errors).
4. Manual e2e on `/profile`: set title+links as roster email → verify `/comday-26` card shows them; unset → fallbacks.

## Validation ownership
- Agent A: existing backend build/checks + curl `/api/profiles/me` + lookup.
- Agent B/C/D: `bunx astro check` scoped; full build owned by integrator.

## Migration / rollout / back-compat
- DB: additive ALTER; no data migration; null title/links = current behavior.
- API: lookup additive fields; old cached frontend unaffected.
- UI: PeopleList fallback chain unchanged for name/avatar; config-level linkedin/github remain as bridge fallback (deprecate after roster emails populate profiles).
- Rollout: backend first; frontend anytime after. Feature flag unnecessary (editor reachable only via signed-in menu; public page degrades gracefully to fallbacks).

## Privacy
- Title/links user-entered → consent by construction. Lookup endpoint already public-by-email (pre-existing posture, unchanged); backend keeps max-50 batch cap.

## Deliberate skips (ponytail)
- No link ordering/labels UI beyond optional `label`; add when requested.
- No admin moderation UI for profiles; add when policy requires.
- No frontend test framework; URL validation via `type="url"` + backend trust-boundary validation. Upgrade path: single node:assert script if normalization logic lands.
