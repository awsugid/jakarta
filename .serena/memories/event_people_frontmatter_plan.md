# Event frontmatter people schema plan (organizers/volunteers by email)

Planning-only. Date: 2026-08-16. Extends `mem:email_keyed_self_service_profile_feature_plan` to event detail pages.

## Verified facts

- `src/content.config.ts` events schema has `redirectTo: z.string().optional()`.
- `src/pages/events/[...slug].astro` `getStaticPaths` filters `!event.data.redirectTo` → redirect events (e.g. `community-day-2026.mdx`) emit no detail page; people frontmatter on them is inert.
- Extra frontmatter keys not in schema (`slug`, `eventDate`, `venue` in `monthly-meetup-july-2026.mdx`) are silently stripped by Zod — adding people frontmatter before schema change is a silent no-op, not an error.
- `PeopleList` (`src/components/people/PeopleList.tsx`) consumes `PersonItem { email, fallbackName?, role?, linkedin?, github? }`, batch-fetches `/api/profiles/lookup`, fallback chain name: profile name → fallbackName → email local-part; role: `person.role` → generic.
- `comday-26.astro` hard-codes `peopleGroups` (not from collection).

## Schema (additive, backward-compatible)

In events schema:

```ts
const person = z.object({
  email: z.string().email(),
  fallbackName: z.string().optional(),
  role: z.string().optional(),
});
organizers: z.array(person).optional(),
volunteers: z.array(person).optional(),
```

- Field names mirror current `PersonItem` → zero mapping in page. `role` is transitional; rename to `fallbackTitle` together with PeopleList P4 wave (single rename, not two).
- No linkedin/github in frontmatter (frozen contract: no page-hardcoded socials).
- No `.max()` cap: PeopleList already batches 50.

## Rendering (`[...slug].astro`)

```ts
const peopleGroups = [
  { label: "Organizers", people: event.data.organizers ?? [] },
  { label: "Volunteers", people: event.data.volunteers ?? [] },
].filter((g) => g.people.length > 0);
```

Conditional section after article, `client:visible`:

```astro
{peopleGroups.length > 0 && (
  <section class="mt-12 pt-12 border-t border-border/50">
    <h2 class="text-2xl font-bold tracking-tight mb-6">Organizers & Volunteers</h2>
    <PeopleList client:visible groups={peopleGroups} />
  </section>
)}
```

## Empty behavior

- Absent fields → no section, no heading, no island.
- `[]` → filtered → same.
- Unpublished profile → PeopleList fallbacks (fallbackName → email local-part; role pill from `role` or generic).
- Dupes across groups OK: fetch dedupes; card appears per group (membership-correct).

## Validation

- Bad email → content parse fails at build (`bun run build` / `bunx astro check`).
- Unknown per-person keys stripped silently (acceptable).
- Route key is `event.id` (filename); `slug` frontmatter inert.

## Migration examples

Transitional:

```mdx
organizers:
  - email: muhammadabdulazizalghofari@gmail.com
    fallbackName: Avei
    role: User Group Leader
volunteers:
  - email: volunteer1@awscommunity.id
    fallbackName: Registration Desk
    role: Guest Experience
```

Final (after profiles published): `organizers: [{ email: ... }]` only.

## Redirect events

Schema uniform; `community-day-2026.mdx` people inert (no detail page). Optional wave 2: `comday-26.astro` reads `getCollection("events")` entry `community-day-2026` and passes its organizers/volunteers → kills hard-coded roster.

## Parallel agents (disjoint)

- A1 schema: `src/content.config.ts`. Frozen shape only.
- A2 renderer: `src/pages/events/[...slug].astro`. Mock shape, parallel with A1.
- A3 pilot content: `src/content/events/monthly-meetup-july-2026.mdx`. After A1.
- A4 (optional): `src/pages/comday-26.astro` + `src/content/events/community-day-2026.mdx`. After A1+A2.
- V validation (read-only): `nvm use 22`, `bunx astro check`, `bun run build`; check no-fields event (no section), pilot event (section renders), `/events` index unchanged, `/comday-26` unchanged.

Sequence: A1+A2 parallel → A3 → (A4) → V.
