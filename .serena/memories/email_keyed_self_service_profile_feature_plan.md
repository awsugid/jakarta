# Email-keyed self-service profile feature plan

Status: planning complete; no application source was modified.
Date: 2026-08-16.
Repositories: `jakarta-website`, `jakarta-backend`.

## Objective

Replace hard-coded Organizer/Volunteer names, titles, and social URLs with a simple first-party profile feature.

- Organizer/Volunteer roster configuration identifies a member by verified email only.
- The website resolves that email through the profile API.
- A signed-in user edits only their own profile.
- Editable profile fields are intentionally small:
  - display name
  - title
  - optional links: Instagram, LinkedIn, GitHub, website, X/YouTube, or an extensible “other” link
- Links that do not exist render nothing. Never render disabled placeholder buttons.
- No avatar upload is added. The existing optional Google profile picture may continue to display; initials remain the fallback.

## Verified current implementation

### Website

- `src/pages/comday-26.astro` defines `peopleGroups` with hard-coded `email`, `fallbackName`, and `role`.
- `src/components/people/PeopleList.tsx` batches member emails through `fetchProfilesLookup()`.
- `src/lib/profiles-api.ts` calls `POST /api/profiles/lookup` with a maximum of 50 emails.
- `PeopleList` currently resolves:
  - name: Google snapshot → hard-coded fallback name → email local part
  - avatar: Google picture → initials
  - title: hard-coded `person.role` or generated generic text
  - LinkedIn/GitHub: hard-coded component props
- When LinkedIn/GitHub is missing, the current UI renders disabled placeholder buttons. This is the immediate visual behavior to remove.
- There is no self-service profile editor. `src/components/auth/UserMenu.tsx` is the correct entry point for a “My Profile” link on desktop and mobile.

### Backend

- `migrations/0005_profiles.sql` creates `profiles(normalized_email, name, picture, updated_at)`.
- `src/auth/google.rs` verifies the Google ID token and snapshots `name`/`picture` on authenticated requests.
- `src/storage/d1.rs::ProfileRepository` upserts Google snapshots and performs prepared batch lookup by normalized email.
- `src/http/profiles.rs::handle_profiles_lookup` exposes public exact-email batch lookup.
- No editable profile details, publication state, or self-service GET/PUT endpoint exists.

## Sources considered and distilled design

Seven possible approaches were considered:

1. Hard-code all profile data in the Astro page — rejected because updates require deployments.
2. Reuse Google OAuth fields for everything — impossible; Google does not provide title or social links.
3. Add one nullable SQL column for every social platform — initially simple but requires a migration whenever a new platform is requested.
4. Add a normalized `profile_links` child table — correct but unnecessarily complex for a maximum of a few links per person.
5. Store the whole profile as one JSON blob — too weak because core name/title/publication fields need explicit validation and querying.
6. Use an external CMS/KV store — introduces a second system and source of truth.
7. Extend the existing `profiles` row with explicit editable fields plus a small JSON link array — recommended.

The two important root constraints are:

- Google profile snapshots must not overwrite user-edited display data.
- Public lookup must not expose every Google account that has ever signed in. Profiles need an explicit publication gate.

## Recommended data model

Create the next D1 migration, expected as `migrations/0006_profile_details.sql`:

```sql
ALTER TABLE profiles ADD COLUMN display_name TEXT;
ALTER TABLE profiles ADD COLUMN title TEXT;
ALTER TABLE profiles ADD COLUMN links_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN profile_updated_at TEXT;
```

Keep existing fields unchanged:

- `normalized_email`: verified ownership key and primary key
- `name`: Google snapshot, not directly user-editable
- `picture`: Google snapshot, not directly user-editable
- `updated_at`: Google snapshot timestamp/current legacy field

Rationale:

- `display_name` is separate from Google `name`; future sign-ins can refresh Google data without overwriting the user’s chosen public name.
- `title` is first-party profile data.
- `links_json` avoids one database column or child-table CRUD path per social platform.
- `is_public` prevents the existing public lookup endpoint from exposing every signed-in account.
- `profile_updated_at` distinguishes an intentional profile edit from passive Google snapshot updates.

Do not backfill `is_public = 1` for every existing row. Existing rows were created passively at authentication time and did not explicitly consent to public profile publication.

## Frozen profile contract

Use camelCase for the authenticated editor request/response and preserve existing snake_case fields in the public lookup response if changing them would break the current client.

### Link shape

```ts
type ProfileLinkKind =
  | "instagram"
  | "linkedin"
  | "github"
  | "website"
  | "x"
  | "youtube"
  | "other";

interface ProfileLink {
  kind: ProfileLinkKind;
  url: string;
  label?: string; // required for `other`, optional otherwise
}
```

### Authenticated profile

```ts
interface MyProfile {
  email: string; // read-only, derived from verified token
  displayName: string | null;
  title: string | null;
  links: ProfileLink[];
  isPublic: boolean;
  picture: string | null; // Google snapshot, read-only
  profileUpdatedAt: string | null;
}
```

### Public lookup profile

```ts
interface PublicProfile {
  normalized_email: string;
  display_name: string;
  title: string;
  links: ProfileLink[];
  picture?: string | null;
  profile_updated_at: string;
}
```

Only `is_public = 1` rows are returned by public lookup. Do not return `is_public`, Google fallback `name`, or other private/internal fields in the public response unless needed.

## API design

Extend the existing profile module rather than creating another domain.

### `GET /api/profiles/me`

- Require a verified Google user through existing `require_user`.
- Derive the row key exclusively from `AuthUser::normalized_email()`.
- Return the user’s editable fields and read-only Google picture.
- If no row exists, create/snapshot it through the existing auth path and return an empty private profile.

### `PUT /api/profiles/me`

Request:

```json
{
  "displayName": "Avei",
  "title": "AWS User Group Leader",
  "links": [
    { "kind": "linkedin", "url": "https://linkedin.com/in/example" },
    { "kind": "github", "url": "https://github.com/example" },
    { "kind": "website", "url": "https://example.com" }
  ],
  "isPublic": true
}
```

Behavior:

- Require a verified user.
- Never accept email in the body or route; the token determines ownership.
- Replace the editable profile fields atomically so removing a link actually clears it.
- When `isPublic` is true, require non-empty valid `displayName` and `title`.
- Empty link list is valid.
- Return the saved `MyProfile`.

### Existing `POST /api/profiles/lookup`

- Keep exact-email batch lookup and maximum 50.
- Normalize and deduplicate emails as it does today.
- Filter SQL with `is_public = 1`.
- Parse `links_json` into typed links before serialization.
- Return only published rows requested by exact normalized email.
- Keep this endpoint POST so roster emails do not appear in URL query logs.
- No cache is needed initially; the request is small, batched, and uses primary-key lookups.

### Optional unpublish behavior

Use `PUT /api/profiles/me` with `isPublic: false`; no separate DELETE endpoint is needed. The profile remains editable but immediately disappears from public lookup.

## Validation rules

Perform validation on the backend trust boundary and mirror it in the editor for immediate feedback.

### Name and title

- Trim whitespace.
- `displayName`: 1–80 characters when published.
- `title`: 1–100 characters when published.
- Private drafts may keep either field null/empty.

### Links

- Maximum 8 links.
- URL maximum 2048 characters.
- Allow only `https://` and, if existing project policy requires it, `http://`; prefer HTTPS in the editor.
- Reject `javascript:`, `data:`, `file:`, credentials/userinfo in URLs, and malformed URLs.
- Require a supported `kind`.
- Permit at most one link for each named platform; permit multiple `other` links only when labels are unique.
- `other` requires a trimmed label of 1–32 characters.
- For named platforms, validate the expected hostname:
  - Instagram → `instagram.com`
  - LinkedIn → `linkedin.com`
  - GitHub → `github.com`
  - X → `x.com` or `twitter.com`
  - YouTube → `youtube.com` or `youtu.be`
  - website/other → any valid allowed HTTP(S) host
- Normalize known platform URLs where an existing validator is already available, but do not over-normalize personal websites.

Extract reusable URL validation from the private helper currently in `src/http/links.rs` into `src/validation/url.rs`; keep the existing Linktree behavior compatible.

## Backend implementation plan

1. Add the additive D1 migration.
2. Extend storage with separate internal row and public/API models if necessary so `links_json` never leaks as a raw string.
3. Add repository methods:
   - `get_profile_by_email`
   - `update_profile_details`
   - updated `lookup_profiles` filtered to published profiles
4. Keep Google `upsert_profile` limited to Google-owned `name` and `picture`; it must not modify `display_name`, `title`, `links_json`, or `is_public`.
5. Add shared profile/link validation.
6. Add authenticated GET/PUT handlers to `src/http/profiles.rs`.
7. Register GET, PUT, and OPTIONS routing next to the existing profile lookup route in `src/http/routes.rs`.
8. Ensure CORS permits the website origin and authorization header, following existing response helpers.

## Frontend profile editor plan

### Route and entry point

- Add `src/pages/profile.astro` as a thin static page shell.
- Add a “My Profile” item to both desktop dropdown and mobile sheet in `src/components/auth/UserMenu.tsx`.
- Render a React editor island with `client:load` because authentication, loading, and form actions are immediately needed above the fold.

### `ProfileEditor` behavior

Create `src/components/profile/ProfileEditor.tsx`:

1. Require the existing `AuthProvider`; signed-out state shows the existing Google sign-in affordance rather than a broken form.
2. Load `GET /api/profiles/me` after authentication.
3. Render a single-column mobile-first form:
   - display name
   - title
   - links list
   - “Add link” button
   - public/private switch or checkbox with clear explanatory copy
   - Save button
4. Each link row contains platform type, URL, optional custom label, and Remove.
5. Hide label input unless kind is `other`.
6. Use native inputs/selects and existing shadcn primitives; add no form library or dependency.
7. Preserve form values on validation/server error and show field-level or summary feedback.
8. On successful save, refresh local state and show a small success message.
9. Explain publication plainly: “When public, this profile can appear on community pages that include your signed-in email.”
10. Do not allow email editing or avatar uploading.

Extend `src/lib/profiles-api.ts` with:

- `getMyProfile()`
- `updateMyProfile(input)`
- shared types for profile/link contracts

Use the existing authenticated `apiFetch` behavior so a 401 logs the user out consistently.

## Public PeopleList plan

Update `src/components/people/PeopleList.tsx`:

1. Reduce `PersonItem` toward `{ email, fallbackName?, fallbackTitle? }` during migration; final intended roster input is `{ email }`.
2. Resolve displayed values:
   - name: published `display_name` → transitional `fallbackName` → safe email-local fallback
   - title: published `title` → transitional `fallbackTitle`; if neither exists, omit the title pill instead of inventing a generic role
   - avatar: published Google picture → initials
   - links: published `links`; no page-hardcoded social URL after rollout
3. Render social buttons by mapping the link array.
4. Use Lucide icons for known platforms and a generic external-link/globe icon for website/other.
5. All links use `target="_blank"` and `rel="noopener noreferrer"`, with useful accessible labels.
6. If `links.length === 0`, render no social row and no spacing reserved for it.
7. Remove the current disabled LinkedIn/GitHub placeholders.
8. Update the loading skeleton so it does not always promise two social buttons; use a neutral optional link-row skeleton or omit that part.
9. Keep the current batch fetch and `client:visible` hydration.

## Roster migration and rollout

Avoid blank or incorrect cards during deployment:

### Stage 1 — backend first

1. Apply migration.
2. Deploy backend repository/API changes.
3. Confirm existing lookup remains backward-compatible for the current website.

### Stage 2 — editor

1. Deploy `/profile` and “My Profile” menu link.
2. Ask known organizers/volunteers to sign in, enter display name/title/links, and publish.
3. Verify each expected email appears through public lookup.

### Stage 3 — PeopleList consumer

1. Deploy the new dynamic title/link rendering.
2. Keep `fallbackName` and `fallbackTitle` in `comday-26.astro` temporarily for members who have not completed profiles.
3. Do not keep hard-coded social URLs; missing published links intentionally show nothing.

### Stage 4 — email-only roster

Once every listed member has published:

```ts
const peopleGroups = [
  {
    label: "Organizers",
    people: [{ email: "member@example.com" }],
  },
  {
    label: "Volunteers",
    people: [{ email: "volunteer@example.com" }],
  },
];
```

Remove transitional fallback names/titles. The page then controls only group membership/order; the profile controls all display data.

## Privacy and security requirements

- Users can modify only the row matching their verified token email.
- Public lookup returns only explicitly published profiles.
- Do not backfill publication for all existing OAuth snapshots.
- Do not expose email visibly in PeopleList cards.
- Public lookup remains exact-match, deduplicated, and capped at 50.
- Use bound SQL parameters for values; never interpolate emails or JSON into SQL.
- Validate URL schemes and hosts before storage.
- React rendering must not use `dangerouslySetInnerHTML` for profile fields.
- Unpublishing must remove the profile from subsequent public lookups immediately.
- Add Cloudflare WAF/rate limiting later only if abuse appears; do not add application-level infrastructure for the initial small roster.

## Parallel multi-agent execution

Before implementation, freeze this contract in Serena Memory. Agents must not independently change route names, JSON field casing, link kinds, or publication behavior.

### Wave 1 — independent foundation work

Run these agents in parallel:

- **Agent P1 — database/storage**
  - Exclusive files: `jakarta-backend/migrations/0006_profile_details.sql`, profile portions of `src/storage/d1.rs`.
  - Deliverables: migration, row/API models, repository methods, links JSON parse/serialize behavior.
  - Dependency: frozen contract only.

- **Agent P2 — validation**
  - Exclusive files: new `jakarta-backend/src/validation/url.rs`, `src/validation/mod.rs`, validator tests.
  - Do not edit `src/http/links.rs` yet to avoid unrelated regression/conflict; integration owner can refactor it later.
  - Dependency: frozen link kinds and limits.

- **Agent P3 — frontend editor shell**
  - Exclusive files: new `jakarta-website/src/pages/profile.astro`, new `src/components/profile/ProfileEditor.tsx`.
  - Develop against frozen mocked `MyProfile` contract.
  - Dependency: frozen API contract, not backend implementation.

- **Agent P4 — PeopleList renderer**
  - Exclusive file: `jakarta-website/src/components/people/PeopleList.tsx`.
  - Implement array-driven link rendering and missing-field omission against frozen types/mocks.
  - Dependency: frozen public profile contract.

### Wave 2 — adapters and API wiring

After P1/P2 method signatures are stable:

- **Agent P5 — backend HTTP/routes**
  - Exclusive files: `jakarta-backend/src/http/profiles.rs`, profile route section of `src/http/routes.rs`, and `src/http/mod.rs` only if needed.
  - Integrates P1 repository and P2 validation.
  - Owns GET/PUT/lookup response semantics and auth enforcement.

- **Agent P6 — frontend API/menu**
  - Exclusive files: `jakarta-website/src/lib/profiles-api.ts`, `src/components/auth/UserMenu.tsx`.
  - Adds types/client methods and desktop/mobile “My Profile” links.
  - P3/P4 must consume its final exported types after merge.

P5 and P6 run in parallel because they touch separate repositories and share only the frozen contract.

### Wave 3 — page integration and compatibility

- **Agent P7 — roster integration**
  - Exclusive file: `jakarta-website/src/pages/comday-26.astro`.
  - Renames `role` fallback to `fallbackTitle`, removes hard-coded social URLs, and preserves transitional display fallback.
  - Runs after P4/P6.

- **Agent P8 — backend compatibility refactor (optional)**
  - Exclusive file: `jakarta-backend/src/http/links.rs`.
  - Switches existing Linktree URL validation to the new shared validator only if behavior remains identical.
  - Independent of P7.

### Wave 4 — validation and review

Use read-only validation agents after all writes merge:

- **Agent V1 — backend validation owner**
  - Apply migration locally/test D1.
  - Run formatting, compile/check, unit tests, and Worker build according to backend repository commands.
  - Curl matrix: unauthenticated GET/PUT → 401; own PUT/GET round-trip; invalid scheme/host/limit → 400; publish → lookup hit; unpublish → lookup miss; attempt to provide another email cannot modify another row.

- **Agent V2 — frontend validation owner**
  - Run `nvm use 22`, `bunx astro check`, `bun run build`, and focused tests if added.
  - Browser scenarios at 360, 414, 768, and desktop widths: signed out, initial private profile, add/remove links, invalid input, save success, 401 logout, zero links, one link, eight links, broken Google photo, and no published profile.

- **Agent V3 — security/accessibility reviewer**
  - Read-only review for IDOR, public enumeration, URL scheme injection, SQL binding, secrets, keyboard navigation, accessible link names, mobile tap targets, and profile publication copy.

Integration owner merges in order: P1/P2/P3/P4 → P5/P6 → type reconciliation for P3/P4 → P7/P8 → V1/V2/V3. Shared hotspots have a single owner: `src/storage/d1.rs` P1, `src/http/profiles.rs` P5, `src/lib/profiles-api.ts` P6, `PeopleList.tsx` P4, and `comday-26.astro` P7.

## Acceptance criteria

1. Signed-in user can open `/profile`, edit their own display name/title/links, publish, save, reload, and see persisted values.
2. Email is derived from the verified token and cannot be edited or supplied to target another profile.
3. Google sign-in snapshot updates never overwrite display name, title, links, or publication state.
4. Public lookup returns the profile only while `isPublic` is true.
5. Organizer/Volunteer cards use email to resolve published name, title, optional picture, and links.
6. Missing title omits the title pill when no transitional fallback exists.
7. Missing links render no social controls and no empty social row.
8. Instagram, LinkedIn, GitHub, website, X/YouTube, and custom links render correct icon/label behavior.
9. Invalid schemes, malformed/oversized URLs, wrong named-platform hosts, excessive links, and invalid custom labels are rejected without partial writes.
10. Existing cards remain usable during staged rollout through temporary fallback name/title values.
11. Unpublishing removes the user from public lookup without deleting their editable draft.
12. Backend migration/build/tests and frontend Astro check/build pass; mobile and accessibility scenarios are manually verified.

## Explicitly out of scope

- Avatar upload, cropping, or image hosting.
- Public standalone profile pages such as `/people/:slug`.
- Admin editing another user’s profile.
- Rich biography, markdown, skills, company, location, or event-specific role history.
- Unlimited links or drag-and-drop ordering; array order from the editor is sufficient.
- External CMS/KV storage.
- Automated scraping/import of social links from Formbricks, Google, LinkedIn, or GitHub.
- Replacing the roster email/group/order configuration with a full volunteer-management system.


# Extension — reusable Organizer/Volunteer cards in event MDX

## Additional objective

The same email-resolved `PeopleList` must be reusable on normal `/events/<slug>` detail pages. Event MDX controls only:

- the custom route slug
- which verified emails belong to the Organizer group
- which verified emails belong to the Volunteer group
- the display order within each group

The profile database remains the source of display name, title, optional Google picture, and all social/external links. Event MDX must not duplicate titles or social URLs after rollout.

## Astro custom slug behavior

The events collection uses Astro’s `glob()` loader. Astro reserves the MDX frontmatter key `slug` and uses it to override the generated collection entry `id`.

Example:

```mdx
---
title: "Monthly Meetup August 2026"
slug: "aws-jakarta-august-2026"
date: 2026-08-27
location: "AWS Jakarta Office"
type: "Meetup"
description: "AWS User Group Jakarta monthly meetup."
---
```

This generates `event.id === "aws-jakarta-august-2026"`, and therefore the route `/events/aws-jakarta-august-2026` through the existing `[...slug].astro` route.

Important rules:

- Do **not** add `slug` to `src/content.config.ts`; Astro documentation explicitly reserves it and raises `ContentSchemaContainsSlugError` when included in a collection schema.
- Continue using `event.id` for `getStaticPaths()`, homepage event links, `/events` list links, Pretix site slug, and React keys.
- Existing event cards already use `event.id`, so valid custom MDX slugs automatically propagate to links.
- Audit duplicate custom slugs because duplicate entry IDs/routes must fail validation rather than silently overwrite output.
- A `redirectTo` event remains excluded from the generic detail `getStaticPaths()`. Its roster can still be consumed by its destination custom page, such as `/comday-26`.

## Event roster frontmatter contract

Use plural arrays of email strings. This is intentionally simpler than person objects because all display data belongs to the user profile.

```mdx
---
title: "Monthly Meetup August 2026"
slug: "aws-jakarta-august-2026"
date: 2026-08-27
location: "AWS Jakarta Office"
type: "Meetup"
description: "AWS User Group Jakarta monthly meetup."
organizers:
  - "organizer@example.com"
  - "co-organizer@example.com"
volunteers:
  - "registration@example.com"
  - "documentation@example.com"
---
```

Recommended Zod fields in `src/content.config.ts`:

```ts
const rosterEmails = z.array(z.string().email()).max(50).optional();

// inside event schema
organizers: rosterEmails,
volunteers: rosterEmails,
```

Validation/normalization behavior:

- Both keys are optional, preserving every existing event.
- Empty arrays are equivalent to absent fields.
- Invalid emails fail Astro content validation and therefore fail the build.
- Maximum 50 entries per group prevents accidental oversized frontmatter; `fetchProfilesLookup()` already deduplicates and chunks requests.
- Preserve MDX ordering for card ordering.
- Normalize emails to trimmed lowercase when mapping them to `PeopleList` props. Zod email validation runs before runtime mapping.
- If the same email appears twice in one group, deduplicate it while preserving the first occurrence; optionally emit a build-time warning.
- The same email may intentionally appear in both groups and should render once in each group.

Do not add per-event `name`, `title`, `role`, `linkedin`, `github`, or generic `links` fields. Those would recreate the hard-coded data problem this profile feature is meant to solve.

## Generic event detail rendering

Update `src/pages/events/[...slug].astro`:

1. Import `PeopleList` and its `PeopleGroup` type.
2. Map the two optional arrays to the existing component shape:

```ts
const peopleGroups = [
  {
    label: "Organizers",
    people: (event.data.organizers ?? []).map((email) => ({ email })),
  },
  {
    label: "Volunteers",
    people: (event.data.volunteers ?? []).map((email) => ({ email })),
  },
].filter((group) => group.people.length > 0);
```

3. Render a conditional “Organizers & Volunteers” section after the MDX `<Content />` and before registration/ticket widgets.
4. Use `<PeopleList client:visible groups={peopleGroups} />` so events without roster data ship no roster island JavaScript.
5. Reuse the current event container width and border/spacing rhythm. Do not copy the large Community Day section markup into every event.
6. If both groups are empty, render no heading, no empty box, and no island.
7. If one group is empty, render only the populated group.
8. If a requested email has no public profile, use the profile plan’s transitional fallback behavior; the final email-only mode may omit that member card or show a neutral unpublished-profile fallback according to the final `PeopleList` policy. Never expose the email in the UI.

Recommended rendering policy after profile rollout:

- Published profile: render full card.
- Missing/private profile for a configured roster email: render initials plus `Community Member` only during migration, or omit the card once all members are expected to publish.
- Missing title: omit title pill.
- Missing links: omit social row completely.

## Redirect/custom event pages

`src/content/events/community-day-2026.mdx` uses `redirectTo: /comday-26`, so `[...slug].astro` will not render its roster. Avoid maintaining a second hard-coded `peopleGroups` list in `src/pages/comday-26.astro`.

Plan:

1. Add `organizers` and `volunteers` arrays to `community-day-2026.mdx`.
2. In `comday-26.astro`, load the `events` collection entry whose `event.id` is `community-day-2026`.
3. Convert the MDX email arrays to `PeopleList` groups using the same shared helper used by the generic event detail page.
4. Delete the hard-coded Community Day `peopleGroups` constant once the profiles and MDX roster are ready.
5. Keep the alias `/events/community-day-2026` → `/comday-26`; the destination page and event metadata now share one roster source.

To prevent mapping logic from drifting, add a small pure helper such as `src/lib/event-people.ts`:

```ts
buildPeopleGroups(organizers?: string[], volunteers?: string[]): PeopleGroup[]
```

The helper owns trimming, lowercase normalization, stable deduplication, labels, and empty-group filtering. Both `[...slug].astro` and `comday-26.astro` consume it.

## Updated rollout sequence

1. Complete the backend profile migration/API and deploy the profile editor.
2. Add `organizers`/`volunteers` schema fields and the shared `buildPeopleGroups()` helper.
3. Add conditional PeopleList rendering to generic event detail pages.
4. Pilot the fields in one non-redirect event MDX using emails whose profiles are already published.
5. Validate custom slug routing and roster display on that pilot event.
6. Move Community Day roster membership into `community-day-2026.mdx` and make `/comday-26` consume it.
7. Keep transitional fallback data only until all configured profiles are published; then every event MDX contains email strings only.

## Parallel multi-agent execution for event integration

Freeze the frontmatter contract (`organizers?: string[]`, `volunteers?: string[]`) and helper signature before implementation.

### Event Wave 1 — parallel foundation

- **Agent E1 — content schema**
  - Exclusive file: `jakarta-website/src/content.config.ts`.
  - Adds optional validated email arrays only; does not add reserved `slug`.
  - Runs content validation against all current event files.

- **Agent E2 — roster mapping helper/tests**
  - Exclusive files: new `jakarta-website/src/lib/event-people.ts` and its focused test.
  - Implements stable normalization/deduplication and empty-group filtering.
  - Works against the frozen `PeopleGroup` contract.

- **Agent E3 — generic event renderer**
  - Exclusive file: `jakarta-website/src/pages/events/[...slug].astro`.
  - Imports the frozen helper and conditionally renders `PeopleList`.
  - Can scaffold in parallel with E1/E2; final typecheck waits for both.

### Event Wave 2 — content pilots and redirect-page migration

- **Agent E4 — pilot normal event**
  - Exclusive file: one selected non-redirect file under `src/content/events/`.
  - Adds custom `slug`, `organizers`, and `volunteers` using published test/member profiles.
  - Starts only after E1 is merged so fields are not silently ignored.

- **Agent E5 — Community Day MDX roster**
  - Exclusive file: `src/content/events/community-day-2026.mdx`.
  - Moves membership/order into email arrays.

- **Agent E6 — Community Day consumer**
  - Exclusive file: `src/pages/comday-26.astro`.
  - Loads the Community Day event entry, calls the shared helper, and removes hard-coded roster data.
  - Runs after E2/E5 contracts are stable.

E4 and E5 run in parallel. E6 runs after E5. `PeopleList.tsx` remains owned by the core profile plan’s Agent P4 and must not be edited by event agents.

### Event Wave 3 — read-only validation

- **Agent EV1 — build/content validation**
  - Runs `nvm use 22`, `bunx astro check`, and `bun run build`.
  - Confirms malformed emails fail content validation.
  - Confirms events without roster fields render no team section/island.

- **Agent EV2 — route validation**
  - Confirms the pilot custom `slug` produces exactly one `dist/events/<slug>/index.html`.
  - Confirms homepage and `/events` cards point to the custom slug through `event.id`.
  - Audits all existing MDX custom slugs for duplicate IDs.
  - Confirms redirect events remain excluded from generic detail output.

- **Agent EV3 — browser/accessibility validation**
  - Tests zero, one, and both roster groups at 360, 414, 768, and desktop widths.
  - Tests published profile, private/missing profile, no title, no links, one link, and many links.
  - Confirms no email is displayed and missing links produce no disabled controls.

Integration order: E1/E2/E3 → E4/E5 → E6 → EV1/EV2/EV3. File ownership is disjoint, and the only shared runtime contract is the frozen `buildPeopleGroups()` return type consumed by `PeopleList`.

## Additional event acceptance criteria

1. Any normal event MDX can add `organizers` and/or `volunteers` as arrays of emails.
2. The custom frontmatter `slug` controls `/events/<slug>` through Astro’s reserved slug mechanism without being added to the Zod schema.
3. Event list and homepage links continue using `event.id` and therefore point to custom slugs correctly.
4. Events without roster fields have no visual or JavaScript change.
5. The event page renders only non-empty groups through the same `PeopleList` used by `/comday-26`.
6. Name, title, picture, and links are resolved from the published profile; MDX controls only membership/order.
7. No link data is duplicated in event content.
8. Missing links render nothing.
9. Community Day roster lives in `community-day-2026.mdx` even though its event route redirects to `/comday-26`.
10. Duplicate/invalid event slugs and invalid roster emails are caught during validation.
