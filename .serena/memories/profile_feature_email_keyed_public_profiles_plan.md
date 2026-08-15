# Email-Keyed Public Member Profiles — Recommendation & Execution Plan

Planning-only. No source modified. Verified against actual code: `jakarta-backend` (Rust Workers + D1), `jakarta-website` (Astro static + React islands).

## Verified current state
- D1 `profiles(normalized_email PK, name, picture, updated_at)` — migration `0005_profiles.sql`; auto-upserted on every Google sign-in (`src/auth/google.rs` `extract_user` → `save_profile_snapshot`).
- `POST /api/profiles/lookup` (`src/http/profiles.rs`) — public, batch ≤50 emails, CORS `*`, NO auth required, NO rate limit, NO publication gate.
- Frontend `src/components/people/PeopleList.tsx` — client-side batch resolve; social links hardcoded per-person in `src/pages/comday-26.astro` (`peopleGroups` config); name fallback chain OAuth→fallbackName→email-user→"Community Member". No caching (1 POST per view per 50 emails).
- Existing validator pattern: `src/validation/linkedin.rs` (canonicalizing, table-driven `cargo test`) + `email.rs` — extend, don't reinvent.

## KNOWN LIVE ISSUE (enumeration)
Public lookup returns name+picture for ANY email that ever signed in (all rows, no gate). Harvest vector today. Fix included below (`is_public`).

## Designs evaluated
| # | Design | Verdict |
|---|--------|---------|
| A | Flat nullable columns on `profiles` (`title`, `linkedin_url`, `github_url`, `instagram_url`, `website_url`) + self-edit `PUT /api/profiles/me` | ✅ WINNER |
| B | Child table `profile_links(email, platform, url, display_order)` | ❌ join + child CRUD for ≤6 fixed platforms; over-build |
| C | JSON `links` TEXT column on `profiles` | ⚠️ no DB-level schema; validation both sides; middle ground, rejected |
| D | Workers KV blob keyed by email | ❌ second source of truth vs D1 snapshot writes; consistency risk |
| E | Build-time bake into static HTML | ❌ stale until redeploy; conflicts with self-service editing |
| F | Full entity + per-field visibility flags | ❌ over-engineered; listing governed by roster + one public flag |
| G | Admin-only managed profiles | ❌ no self-service; contradicts "keyed by authenticated email" requirement |

Rationale A: minimal diff (1 migration, additive columns; existing `INSERT` lists columns explicitly → old writer code stays valid), no joins, contract purely additive, extensibility = rare cheap `ALTER TABLE` when a new platform appears.

## Recommended design (A + privacy gate)
### Data (migration `0006_profile_fields.sql`)
```sql
ALTER TABLE profiles ADD COLUMN title TEXT;
ALTER TABLE profiles ADD COLUMN linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN github_url TEXT;
ALTER TABLE profiles ADD COLUMN instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN website_url TEXT;
ALTER TABLE profiles ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
UPDATE profiles SET is_public = 1;  -- backfill: preserves today's public behavior exactly
```
- `name`/`picture` remain Google-snapshot-owned (upsert COALESCE keeps Google authoritative — avoids user-edit vs snapshot write conflict).
- `title` + social URLs are user-owned via self-edit.
- `is_public`: user consent toggle. Default 0 (new users private); backfill 1 (no regression vs status quo). Private row → lookup omits → PeopleList falls back to `fallbackName`/initials (already implemented).

### API (frozen contract)
1. `POST /api/profiles/lookup` — path/shape unchanged. Response profile object gains additive nullable fields: `title, linkedin_url, github_url, instagram_url, website_url`. Rows filtered `WHERE is_public = 1`. Old clients unaffected.
2. `GET /api/profiles/me` — auth (Bearer Google ID token). Returns own full row incl. `is_public`.
3. `PUT /api/profiles/me` — auth. Body: `{ title?, linkedin_url?, github_url?, instagram_url?, website_url?, is_public? }` (null/absent = clear/no-change; explicit null clears field). Validates + canonicalizes URLs server-side. Max: title 100 chars, URLs 2048.

### Social URL validation (server = trust boundary; `src/validation/` new modules, mirror `linkedin.rs` pattern)
- All URLs: absolute, scheme `https` only (reject `http`, `javascript:`, `data:`), no userinfo, non-empty host, ≤2048 chars.
- `linkedin_url`: reuse `normalize_linkedin_url` (canonical `linkedin.com/in/{slug}`).
- `github_url`: host `github.com`, path = 1 segment, canonical lowercase host.
- `instagram_url`: host `instagram.com`, path = 1 segment.
- `website_url`: any https host containing `.`.
- Invalid → 400 with field name. Frontend mirrors for UX only (never security).
- Render: `target="_blank" rel="noopener noreferrer"` (PeopleList already does).

### Frontend
- `src/lib/profiles-api.ts`: extend `Profile` type (additive); add `fetchMyProfile` / `updateMyProfile` using `authHeaders()`.
- `PeopleList.tsx`: profile fields override page-config links; config `linkedin`/`github` = fallback. Title: `person.role` fallback → `profile.title`? No — inverse: `profile.title` primary, `person.role` fallback (per shared context: profile is source). Missing links render NOTHING (drop current disabled-button placeholders — per shared context).
- Self-edit UI: "My Profile" dialog off existing `HeaderAuth` dropdown (auth infra already exists). Mobile-first, dark-first, `client:visible`.
- Caching: client-side `sessionStorage` cache `profiles-v1` = `{fetchedAt, byEmail}` TTL 10 min; `updateMyProfile` success clears it. Server stays POST (emails in GET query would land in edge logs — privacy). `updated_at` bump = invalidation signal if TTL later needs shortening. ponytail: no server cache/ETag now; add GET+Cache-Control if traffic demands.
- Rate limit: Cloudflare WAF rule on `/api/profiles/lookup` (~30 req/min/IP) — config, no code. Roster emails in page source are public by design (accepted).

## Migration risks
1. Column adds are additive + nullable → old worker binary keeps working during rollout window. Deploy order: D1 migrate → backend → frontend.
2. Backfill `is_public=1` required before/with backend deploy, else all cards lose enrichment (fallback chain prevents breakage, only cosmetic regression).
3. D1 migrations idempotent style (`IF NOT EXISTS` habit; ALTER has no IF NOT EXISTS in SQLite — guard by checking `PRAGMA table_info` or accept single-run migration ledger).
4. Rollback: additive columns are harmless to old code; `is_public` filter is the only behavioral change — revert worker = old behavior.
5. Google snapshot COALESCE never nulls existing values — safe alongside user edits (name/picture untouched by self-edit).

## Test strategy
- Backend unit (cargo test, extend pattern in `linkedin.rs`): table-driven URL validator cases (valid/invalid per platform, scheme/host/userinfo/length), title length bound, is_public parsing.
- Backend integration (`wrangler dev` + curl script, pattern matches repo's `patch_*.sh`): lookup omits private rows; lookup returns additive fields for public rows; `GET/PUT /me` 401 without token; PUT persists + canonicalizes; PUT rejects `javascript:` URL with 400 + field name.
- Frontend: `nvm use 22 && bunx astro check` + `bunx tsc --noEmit` (ignore pre-existing PagesFunction errors); Playwright MCP pass on comday-26 people section (skeleton → cards; missing link renders nothing) and profile dialog (edit → save → card reflects after cache clear).
- Privacy check: curl lookup with non-roster email that has signed in → expect omission (post-`is_public` world).

## Parallel execution plan (divide & conquer)
Frozen contract = this memory §API + §migration DDL + §validation rules. Agents work against contract, not each other's WIP.

- **Phase 0 — contract freeze (solo, done by this plan)**: this memory is the contract.
- **Phase 1 (parallel, disjoint write scopes):**
  - **BE-1** owns `migrations/0006_*.sql` + `src/storage/d1.rs` (ProfileRepository: new columns, `is_public` filter in lookup, `get_profile`/`upsert_profile_fields` fns). Do NOT touch routes.
  - **BE-2** owns `src/validation/` (new url.rs modules + tests), `src/http/profiles.rs` (`GET/PUT /me` handlers), `src/http/routes.rs` (register 2 new routes only — sole owner of routes.rs edits). Depends on BE-1 repo fns signature → code against contract signatures; integrate in Phase 2.
  - **FE-1** owns `src/lib/profiles-api.ts` + `src/components/people/PeopleList.tsx` (types, profile-over-config merge, render-nothing-for-missing-links, sessionStorage cache).
  - **FE-2** owns profile self-edit dialog `src/components/profile/` + `HeaderAuth.tsx` dropdown entry. Mocks client fns per contract; depends on FE-1 types at integration.
- **Phase 2 — integration (sequential):** merge BE-1+BE-2 (routes.rs single-owner already), `wrangler dev` smoke: privacy filter + PUT→lookup roundtrip. Then FE-1+FE-2, point at dev backend.
- **Validation ownership:** BE-2 runs cargo test + wrangler dev smoke; FE-1 runs astro check/tsc/build; FE-2 runs Playwright MCP dialog flow; final owner (coordinator) reruns full: `cargo test`, `nvm use 22 && bun run build`, prod smoke.
- **Rollout:** apply D1 migration → deploy backend → deploy website. Additive everywhere; no breaking window. Backward compat: old frontend ignores new fields; private profiles degrade to existing fallback UI.

## Explicitly skipped
Child-table extensibility (add column when platform appears), server-side response caching (client TTL suffices), per-field visibility (one flag enough), GET lookup (privacy: emails in query strings).