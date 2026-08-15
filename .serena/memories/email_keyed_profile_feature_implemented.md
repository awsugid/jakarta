# Email-keyed profile feature implemented

Implemented across `jakarta-backend` and `jakarta-website` on 2026-08-16.

Backend:
- Added `migrations/0006_profile_details.sql` with `display_name`, `title`, `links_json`, `is_public`, and `profile_updated_at`.
- Added authenticated GET/PUT `/api/profiles/me` keyed exclusively by verified token email.
- Public `POST /api/profiles/lookup` now returns only `is_public = 1` rows and exposes only public profile fields.
- Added validated/normalized profile links (instagram/linkedin/github/website/x/youtube/other), max 8, platform host checks, safe schemes, no userinfo, and normalized storage.
- Google snapshot upsert remains isolated to Google-owned name/picture fields.

Website:
- Added `/profile`, aesthetic mobile-first `ProfileEditor`, and desktop/mobile UserMenu entry.
- Added load-failure protection so a transient GET error cannot be saved over an existing profile.
- Redesigned `PeopleList` with polished dark/orange cards, gradient avatar ring, responsive grid, optional title, optional social links, no disabled placeholders, broken-image fallback, and neutral unpublished-member fallback.
- Added optional `organizers` and `volunteers` email arrays to event MDX schema.
- Added `buildPeopleGroups()` and conditional reusable PeopleList rendering on generic event detail routes.
- Community Day roster moved to `community-day-2026.mdx`; `/comday-26` consumes that content entry.

Validation:
- Backend `cargo fmt --check`, `cargo test` (124 passed), and wasm-target clippy with warnings denied passed.
- Website `bun run build` with Node 22 passed and generated 23 routes including `/profile`.
- `astro check` still has 7 pre-existing unrelated errors: 2 Cloudflare PagesFunction typing errors, 4 PretixWidget Element/HTMLElement errors, and the existing AuthProvider GIS typing error.
- CamoFox verified `/profile` hydration/accessibility and the Community Day MDX roster island/skeleton. Populated profile-card API rendering requires migrated/running backend data.

Deployment requirement: apply D1 migrations 0005 then 0006 before deploying the new Worker; deploying code first will make profile SELECTs fail on missing columns. Confirm/replace placeholder `volunteer1@awscommunity.id` before production.