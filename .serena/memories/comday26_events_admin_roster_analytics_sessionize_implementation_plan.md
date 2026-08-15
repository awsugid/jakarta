# Community Day 2026 multi-workstream implementation plan

Status: planning complete; no source implementation performed.
Date: 2026-08-16.
Repositories: `jakarta-website` and `jakarta-backend`.

## Goals

1. Publish one Community Day 2026 event record so it appears on `/events` and homepage Upcoming Events, while one or more `/events/...` aliases redirect to `/comday-26`.
2. On `/admin`, log out when an authenticated API request receives a token-related 401 instead of treating the user as forbidden and redirecting to `/`.
3. Add a reusable Organizer/Volunteer people list keyed by email address(es), using Google-connected account snapshots for name/photo and robust fallbacks when profile data is unavailable.
4. Show visible skeletons for Community Growth and Demographic charts while statistics are loading, including slow backend cache misses; distinguish loading from terminal empty data.
5. Integrate the Community Day Sessionize CFP into `/comday-26` and `/speakers`, subject to a valid Sessionize event URL/public embed identifier.
6. Apply focused `/comday-26` correctness, accessibility, mobile, and performance improvements.

## Verified architectural facts

- Website `package.json` currently declares Astro `^7.0.6`; this overrides stale Astro 6 references in AGENT.md/older memories. Node 22 and Bun remain required.
- Website is static output. Astro documentation says `Astro.redirect()` is SSR-only; use `astro.config.mjs` redirects for known static aliases. Below-fold React islands should prefer `client:visible`.
- Events are sourced from `src/content/events/*.mdx`; both `/events` and homepage Upcoming Events read the same collection. Homepage sorts by date descending and takes three.
- No Community Day 2026 event content record exists.
- Google Identity Services returns an ID token. `name` and `picture` are optional claims available with profile/email consent. The backend currently validates these claims per request but does not persist connected-account profiles, and Google does not provide an arbitrary public email-to-profile lookup.
- Admin token failures are returned as HTTP 401; non-admin users receive 403. `AdminGuard` currently collapses probe errors into `false`, then redirects to `/` as forbidden. Existing user-facing flows already call `signOut()` on 401.
- Statistics uses a client `useEffect` fetch. Backend cache misses trigger live Pretix aggregation and can be slow. Existing `bg-muted/20` pulse blocks are so faint they look empty, and some empty datasets are incorrectly treated as perpetual loading.
- Current Sessionize URL in `CFPSection.tsx`, `https://sessionize.com/aws-community-day-indonesia-2026`, returned HTTP 404 during planning. A valid CFP URL and, if widget/API content is wanted, the Sessionize public embed/API ID must be obtained before implementation.
- No repository CSP is configured, but deployment-level Cloudflare CSP must still be checked. A direct CFP iframe is not assumed to work; use a hosted Sessionize link unless Sessionize explicitly supplies embeddable CFP code.

## Global execution model

Create a short-lived integration branch only if explicitly requested. Otherwise agents work in the same checkout with strictly disjoint write scopes. Freeze cross-repository API contracts in Serena Memory before implementation. Run implementation agents in two waves:

- Wave 1, fully parallel: Events/redirects, admin auth, backend profile store/API, frontend PeopleList against a frozen mock contract, statistics skeletons, Sessionize component scaffold/config, and independent Community Day fixes that do not overlap Sessionize integration.
- Wave 2, integration: wire the completed Sessionize component into pages, wire PeopleList into selected pages, resolve any shared-file conflicts, and perform end-to-end validation.

Assign one integration/validation agent that does not author feature code. It owns merge ordering, broad checks, browser checks at 360/414/768/desktop widths, secret scan, and final `git diff` review.

## Workstream A — Community Day event discovery and `/events` redirects

### Recommended design

Use a single collection record as the source of display metadata and explicit static redirects for known aliases.

1. Extend `src/content.config.ts` event schema with optional `redirectTo`, constrained to a site-relative path beginning with `/`.
2. Add `src/content/events/community-day-2026.mdx` with confirmed title, date, venue, type, description/image, and `redirectTo: /comday-26`. Confirm the public event date first; current page copy says October 31, 2026.
3. In `src/pages/events/[...slug].astro`, exclude entries with `redirectTo` from `getStaticPaths()` so the dynamic event detail route does not emit a competing static file.
4. Add explicit aliases in `astro.config.mjs`, initially `/events/community-day-2026` → `/comday-26`. Add additional requested aliases only when their exact slugs are confirmed. Do not use `Astro.redirect()` in static output.
5. Keep card URLs pointing to `/events/${event.id}` so the requested custom events route is exercised and redirected. The same content record automatically appears in `/events` and homepage Upcoming Events; no duplicate homepage data source.
6. Add a build assertion that `dist/events/community-day-2026/` contains the redirect output and that `/comday-26` is generated. Verify only one Community Day card is shown.

### Acceptance criteria

- `/events` contains Community Day 2026 with correct date/venue/type.
- Homepage Upcoming Events includes it according to the current top-three date sort.
- `/events/community-day-2026` redirects to `/comday-26` without a route collision.
- Direct `/comday-26` remains canonical and usable without JavaScript.
- Build fails on malformed `redirectTo` values.

### Parallel-agent execution

- Agent A1 writes only `src/content/events/community-day-2026.mdx`.
- Agent A2 writes only `src/content.config.ts` and `src/pages/events/[...slug].astro`.
- Agent A3 writes only `astro.config.mjs` and a focused redirect build assertion if an existing test location is available.
- A1/A2/A3 run in parallel after alias slugs/date/venue are frozen in memory. A2 and A3 agree that redirect entries are excluded from generated detail paths. Integration agent merges A2, then A3, then A1 and runs the static route check.

## Workstream B — `/admin` expired-token logout

### Root cause

`src/lib/api.ts` throws status-bearing errors but has no shared 401 handler. `AuthProvider.probeAdmin()` converts every error to `false`, writes a negative admin cache, and `AdminGuard` treats that as forbidden, triggering `ForbiddenRedirect` to `/`. Mid-session 401s in admin screens are shown as generic errors. Backend expired and invalid Google ID tokens both map to 401, while a valid non-admin maps to 403.

### Recommended minimal fix

1. Add a shared unauthorized handler in `src/lib/api.ts` used by `apiFetch` and the duplicated `deleteLink` response path. On 401, remove `g_id_token` and `g_admin_cache`, dispatch `auth-state-change` with null detail, then throw the original status-bearing error.
2. In `AuthProvider.tsx`, make `probeAdmin()` preserve the 401 distinction and do not write `{isAdmin:false}` for 401. The global auth event moves the guard to the existing signed-out state.
3. Keep the current forbidden redirect for 403 only; valid non-admin accounts retain current behavior.
4. Optional hardening only if product wants exact error semantics: change backend Google validation to return a stable `TOKEN_EXPIRED` code distinct from malformed/invalid tokens. This is not required for safe logout because all 401 credentials are unusable and should be cleared.
5. Do not add refresh-token logic in this task; Google GIS ID-token authentication currently has no refresh-token flow.

### Acceptance criteria

- Expired/invalid stored credentials produce logout and the admin sign-in UI; browser does not navigate to `/`.
- 401 does not poison `g_admin_cache` for five minutes.
- Valid non-admin 403 still shows/uses the forbidden behavior.
- Admin dashboard, forms, response drawer, and link mutations all share the same behavior.

### Parallel-agent execution

- Agent B1 writes only `src/lib/api.ts` and focused unit tests for unauthorized cleanup/event dispatch if the existing test setup permits.
- Agent B2 writes only `src/components/auth/AuthProvider.tsx` and guard/probe tests.
- Agent B3 is read-only validation: simulate 401, 403, and healthy responses in browser after B1/B2 merge.
- B1 and B2 run in parallel. B3 runs after merge. Backend remains untouched unless the optional stable error code is separately approved; if approved, Agent B4 owns only backend auth/error files and publishes the error contract before B1 starts.

## Workstream C — Organizer and Volunteer connected-account people list

### Important constraint

An email address cannot be used to query arbitrary Google profile data. The system must persist a profile snapshot when that exact account authenticates. Existing users will have no stored snapshot until they sign in again after deployment. This rollout behavior must be accepted explicitly.

### Frozen API/data contract

Backend migration adds a minimal profile snapshot table keyed by normalized email:

- `normalized_email TEXT PRIMARY KEY`
- `name TEXT NULL`
- `picture TEXT NULL`
- `updated_at TEXT NOT NULL`

Public batch lookup:

- `POST /api/profiles/lookup`
- request `{ "emails": ["person@example.com"] }`, normalized/deduplicated, maximum 50
- response `{ "profiles": [{ "email": "person@example.com", "name": null, "picture": null }] }`
- return only requested/stored rows; never support search, prefix lookup, or enumeration.

Capture snapshots from verified Google claims on authenticated requests. Upsert asynchronously/best-effort so profile persistence cannot break the authenticated action. Refresh the snapshot at future sign-ins/requests. Validate picture URLs as HTTPS and allow only expected Google-hosted images if practical; never proxy arbitrary stored URLs without validation.

### Frontend component contract

Create `src/components/people/PeopleList.tsx` with a batch-first prop even though each person is keyed by email:

- `groups: Array<{ label: string; people: Array<{ email: string; fallbackName?: string; role?: string }> }>`
- one lookup request for all unique emails
- resolved display name priority: stored OAuth name → explicit `fallbackName` → humanized email local part → `Community Member`
- resolved avatar: stored valid picture → initials in existing shadcn `AvatarFallback`
- do not print email addresses in the public UI unless explicitly requested
- loading uses compact avatar/text skeleton rows
- fetch error, missing row, denied profile permission, stale/broken image, and inaccessible image all silently fall back; image `onError` removes the broken source
- hydrate with `client:visible`

Place the Organizer group on `/comday-26`. Place Volunteer group either on `/comday-26` or `/volunteer` only after the desired roster and ordering are supplied. Keep roster configuration near the consuming page rather than hard-coding it inside the generic component.

### Security/privacy acceptance criteria

- Only exact requested normalized emails can be returned; batch capped at 50.
- No endpoint permits arbitrary account discovery.
- Missing Google profile permission never creates a blank card.
- Stale image URLs degrade to initials.
- The public roster and use of connected-account profile data have organizer consent.
- Existing members without a post-deploy sign-in render approved fallback names/initials.

### Likely files

Backend: new migration (next available number), `src/storage/d1.rs`, a small profile capture module under `src/auth/`, new `src/http/profiles.rs`, `src/http/mod.rs`, `src/http/routes.rs`.
Website: `src/lib/types.ts`, `src/lib/api.ts`, new `src/components/people/PeopleList.tsx`, selected page(s).

### Parallel-agent execution

- First write the final JSON contract and normalization rules to a Serena memory and freeze it.
- Agent C1 owns all backend migration/storage/capture/route files.
- Agent C2 owns `src/lib/types.ts`, profile lookup client function, `PeopleList.tsx`, and pure fallback tests. Because `src/lib/api.ts` overlaps Workstream B, C2 must either wait for B1 or put profile lookup in a new `src/lib/profiles-api.ts`; prefer the new file to preserve parallelism.
- Agent C3 owns only roster data and `/comday-26` integration.
- Agent C4 owns only optional `/volunteer` integration.
- C1/C2 run in parallel against the frozen contract. C3/C4 can build against mocked profile data in parallel but merge after C2. Integration agent runs sign-in → snapshot → lookup → display and missing-profile fallback checks.

## Workstream D — Statistics chart skeleton and empty states

### Root cause

The UI cannot directly know whether the Worker cache was hit; it only knows the request is pending. Showing a skeleton for every pending statistics request correctly covers slow cache misses. Existing pulse placeholders use `bg-muted/20`, which is nearly invisible on dark cards and unanimated before a `client:visible` island hydrates. Several charts also conflate empty terminal data with loading, yielding a perpetual pseudo-skeleton or a blank Recharts area.

### Recommended fix

1. Add a local reusable `ChartSkeleton` in `StatisticsCharts.tsx` or the existing UI layer only if another component will reuse it. Avoid adding a package.
2. Use a visible dark-theme token such as `bg-muted/50`, chart-like bars/lines or blocks, `animate-pulse`, fixed matching chart height, `role="status"`, and screen-reader text.
3. Replace the timer/data-derived loading predicate with explicit request state: `loading`, `ready`, `error`. Remove the artificial 100 ms delay unless it demonstrably prevents flash.
4. Render per-card states in this order: pending → skeleton; request complete with empty dataset → `No data yet`; populated → chart. Add empty guards to historical and current-year datasets.
5. Keep `client:visible`; ensure the server-rendered initial skeleton is visibly styled even before hydration.
6. Do not add Suspense/SWR/client cache for this focused fix. Do not change backend cache behavior unless later profiling shows cold Pretix aggregation itself needs optimization.

### Acceptance criteria

- On throttled first request/cache miss, every Community Growth and Demographic card shows an obvious placeholder, not an empty rectangle.
- Empty successful data shows `No data yet`, never an infinite pulse.
- Fetch error shows the existing actionable error state.
- Skeleton and chart dimensions match to avoid layout shift.
- Dark mode and 360–414 px widths remain readable.

### Parallel-agent execution

- Agent D1 writes only `src/components/StatisticsCharts.tsx`.
- Agent D2 writes only a new pure chart-state helper/test if extraction is justified; otherwise it is a read-only test author reviewing D1.
- Agent D3 is browser-validation-only, using network throttling and mocked empty/error responses.
- D1/D2 run in parallel only if helper signatures are frozen first. D3 runs after merge. This workstream is otherwise independent of all page/auth/profile work.

## Workstream E — Sessionize CFP on `/comday-26` and `/speakers`

### Blocking inputs

Before coding, obtain and verify:

1. Valid Community Day 2026 Sessionize CFP URL. Current hard-coded URL returns 404.
2. CFP open/close dates and whether the CFP is currently open.
3. Sessionize public embed/API identifier if schedule/speaker/session widgets are desired.
4. Whether Cloudflare Pages has deployment-level CSP outside the repository.
5. Product choice: hosted CFP CTA/card (recommended and reliable) versus a Sessionize-supplied official embed. Do not iframe the normal Sessionize CFP page unless Sessionize explicitly allows it.

### Recommended integration

1. Centralize Sessionize configuration in one typed module, using public environment variables if operators need to change IDs without code edits: CFP URL, public API/embed ID, open/close dates.
2. Create a shared `CommunityDayCfp` component that renders event-specific status, deadline, CFP tracks/benefits summary, and a prominent external Sessionize action with `target="_blank" rel="noopener noreferrer"`. Include a fallback when config is absent or Sessionize is unavailable.
3. On `/comday-26`, use the shared component inside or immediately after `CFPSection`; remove the duplicated hard-coded URL and ensure venue/date copy is sourced consistently.
4. On `/speakers`, add a clearly scoped “AWS Community Day Indonesia 2026 CFP” section without replacing the existing monthly/Formbricks speaker application flow. Explain that one CTA is Community Day-specific and the other is the general community speaker flow.
5. If a valid Sessionize widget/API is supplied, isolate it in a lazy `client:visible` React island with loading/error/fallback-link states. Prefer public JSON API + native Tailwind rendering for dark mode/accessibility; use Sessionize’s official script only if its documented embed is required. Do not send user tokens or PII.
6. Add CSP directives only after observing actual required origins: likely Sessionize script/connect/style/image origins. Do not broaden to `*`.

### Acceptance criteria

- Both pages show the same confirmed CFP status/deadline and valid link.
- `/speakers` clearly differentiates Community Day CFP from general speaker applications.
- Missing config or third-party failure leaves a usable direct-link/fallback state.
- Mobile does not horizontally overflow; focus, contrast, and external-link semantics are correct.
- No third-party request occurs before the section becomes visible if a widget is used.

### Parallel-agent execution

- Agent E0 is configuration/research-only: obtains valid Sessionize values, tests endpoints, records CSP origins and response formats in Serena memory. E0 blocks final wiring but not UI scaffold work.
- Agent E1 owns a new typed Sessionize config module and shared CFP/widget component.
- Agent E2 owns only `/speakers` integration (`src/pages/speakers.astro` and/or `SpeakerPageContent.tsx`).
- Agent E3 owns only `CFPSection.tsx` integration. Because `comday-26.astro` is shared with PeopleList and page polish, E3 must not edit that page; integrate within `CFPSection.tsx`.
- E1 can scaffold against typed placeholder config while E0 researches. E2/E3 start after E1’s public component contract is frozen. Validation agent tests valid, absent, 404, and slow Sessionize configurations.

## Workstream F — focused `/comday-26` improvements

Prioritize correctness and accessibility over broad redesign:

1. Fix countdown target mismatch: `ComDayHero.tsx` currently targets October 25 while visible event date says October 31, 2026. Confirm date/time before changing.
2. Fix venue contradiction: `CFPSection.tsx` references Tangerang while FAQ references BINUS Anggrek/Jakarta Barat. Confirm venue and centralize copy.
3. Remove unused `scheduleColumns`, `scheduleItems`, and commented `ScheduleTable` integration from `comday-26.astro`, or restore it only when a confirmed agenda exists.
4. Convert hero scroll buttons to anchor semantics (`href="#tickets"`, etc.) with progressive enhancement so navigation works without JavaScript and by keyboard.
5. Reduce eager hydration: move below-fold interactive sections from `client:load` to `client:visible`; use `client:idle` only where header/above-fold interaction requires it.
6. Prevent `MobileStickyBar` from covering final FAQ/footer content with adequate mobile bottom padding; optionally hide it while the ticket section is visible.
7. Align ticket-status copy across alert, hero badge, and sticky CTA; avoid static urgency text that can drift.
8. Add page description/Open Graph metadata through `Layout.astro` only if the layout supports it; otherwise extend the layout minimally and update only this page.
9. Decide whether Community Day belongs in primary navigation. Add it only after product confirmation because the event record and homepage card already improve discovery.

### Parallel-agent execution

- Agent F1 owns only `ComDayHero.tsx` (countdown and anchor semantics).
- Agent F2 owns only `MobileStickyBar.tsx` plus page-level bottom spacing. Because `comday-26.astro` overlaps PeopleList placement and dead-code cleanup, F2 must coordinate through a frozen patch contract or defer its page edit to integrator.
- Agent F3 owns only `comday-26.astro` dead-code cleanup, metadata, hydration directives, and final section ordering. F3 runs after C3 if PeopleList also edits the page.
- Agent F4 owns only copy consistency in `CFPSection.tsx` but must merge after E3 because Sessionize also touches that file; combine E3/F4 into one owner if possible.
- Agent F5 is accessibility/mobile audit only. F1 and F2 can start immediately after event facts are confirmed; F3/F4 are Wave 2 due shared-file dependencies.

## Integration sequence

1. Product/config checkpoint: confirm event date/time/venue, exact redirect aliases, organizer/volunteer email roster plus fallback names/order, public-profile consent, valid Sessionize URL/ID/deadline/status, and navigation choice.
2. Freeze three Serena memories: event facts/aliases, public profile API contract, Sessionize config/embed contract.
3. Wave 1 parallel agents: A1-A3, B1-B2, C1-C2, D1-D2, E0-E1, F1-F2.
4. Intermediate targeted validation by each owner.
5. Wave 2: C3/C4 page placement, E2/E3 integration, F3/F4 cleanup and copy consolidation.
6. Integration agent resolves the two known shared-file hotspots: `src/lib/api.ts` (avoid via `profiles-api.ts`) and `src/pages/comday-26.astro` (single Wave-2 owner).
7. Full validation and browser audit.

## Validation matrix

Website commands from `jakarta-website`:

- `nvm use 22`
- `bun test` if focused tests are added
- `bunx astro check`
- `bun run build`
- inspect generated redirect and canonical page in `dist`
- `git status`, `git diff`, secret scan

Backend commands from `jakarta-backend` should follow its repository instructions; at minimum run formatting, tests, and the wasm/Worker build used by that project. Apply the new D1 migration in a local/test environment before endpoint smoke testing.

Manual/browser scenarios:

- `/events`, homepage Upcoming Events, redirect alias, and direct `/comday-26`.
- Admin healthy token, expired/invalid token (401), and valid non-admin (403).
- Profile hit, no stored profile, null name, null picture, broken picture URL, lookup failure, and roster at 360 px.
- Statistics slow pending request, populated response, empty successful response, and network/server error.
- Sessionize valid config, missing config, 404, slow response, keyboard navigation, and mobile overflow.
- `/comday-26` ticket/CFP anchors without JavaScript, sticky bar overlap, countdown/date/venue consistency, and reduced hydration.

## Decisions still required before implementation

1. Exact custom `/events/...` alias list.
2. Confirmed Community Day date, start time, and venue.
3. Organizer and volunteer email lists, display ordering, fallback names/roles, and consent to show connected-account profile data publicly.
4. Whether public profiles should appear only on `/comday-26`, also on `/volunteer`, or elsewhere.
5. Valid Sessionize CFP URL, public embed/API ID, deadline/status, and whether hosted-link CTA or official widget is desired.
6. Whether Community Day should be added to primary navigation.

## Out of scope unless separately approved

- Google OAuth authorization-code/refresh-token flow or periodic Google profile synchronization.
- Arbitrary Google profile lookup by email.
- Redesigning all event routing or replacing the content collection.
- Replacing the statistics data layer with SWR/Suspense or changing Pretix aggregation/cache architecture.
- Embedding a normal Sessionize CFP page in an iframe without explicit Sessionize support.
- Broad `/comday-26` visual redesign unrelated to the identified correctness/mobile/accessibility issues.
