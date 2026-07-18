# Phase 1 — Pretix Event Stats on Event Detail Pages

Goal: show registered participant count and attended/check-in count on `/events/[slug]` detail pages.

## Scope

This phase is public aggregate data only. No user auth is required. No attendee/order PII should be returned to the frontend.

## Current website files

Relevant existing files:

- `jakarta-website/src/content.config.ts`
  - events collection currently includes `pretixUrl`, `pretixSubevent`, `pretixListType`.
- `jakarta-website/src/pages/events/[...slug].astro`
  - event detail page.
- `jakarta-website/src/components/PretixWidget.tsx`
  - existing Pretix widget/iframe integration.
- `jakarta-website/src/lib/api.ts` and `src/lib/types.ts`
  - place to add typed frontend API helper/types.

## Content schema changes

Add optional Pretix mapping fields to event content:

```ts
pretixOrganizerSlug?: string;
pretixEventSlug?: string;
pretixCheckinListId?: string;
pretixSubevent?: string; // already exists; keep using for series if present
```

Optional only if needed:

```ts
pretixItemIds?: number[];
```

Recommendation:
- Prefer explicit `pretixOrganizerSlug`, `pretixEventSlug`, and `pretixCheckinListId` over parsing `pretixUrl`.
- `pretixUrl` remains for the widget.
- `pretixCheckinListId` is the key data for accurate stats.

## Backend endpoint

Add in `jakarta-backend`:

```http
GET /api/events/:siteSlug/pretix-stats
```

Backend lookup options:
1. MVP: website passes mapping through static content? Not ideal because backend still needs to know Pretix mapping.
2. Recommended: add backend D1 table or config mapping for site slug -> Pretix organizer/event/check-in-list.
3. Acceptable transitional approach: backend derives organizer/event from event frontmatter sent as query params only for public stats, but avoid this long-term.

Recommended response:

```ts
interface PretixEventStats {
  site_slug: string;
  pretix: {
    organizer_slug: string;
    event_slug: string;
    checkin_list_id: string;
    subevent_id: string | null;
  };
  registered_count: number;
  checked_in_count: number;
  attendance_rate: number | null;
  last_refreshed_at: string;
  stale: boolean;
}
```

## Backend Pretix counting method

Use Pretix check-in list positions endpoint and read the top-level `count`.

Registered participants:

```http
GET {PRETIX_API_BASE_URL}/api/v1/organizers/{organizer}/events/{event}/checkinlists/{list}/positions/?page_size=1
Authorization: Token <PRETIX_API_TOKEN>
```

Checked-in participants:

```http
GET {PRETIX_API_BASE_URL}/api/v1/organizers/{organizer}/events/{event}/checkinlists/{list}/positions/?page_size=1&has_checkin=true
Authorization: Token <PRETIX_API_TOKEN>
```

Add query params when applicable:

```text
&subevent={pretixSubevent}
&item__in=1,2,3
```

Notes:
- Count order positions, not raw orders.
- Do not fetch `results` beyond page size 1 for aggregate counts.
- Do not return any order position details to frontend.
- If check-in list detail endpoint exposes direct aggregate fields on the deployed Pretix version, use that instead and keep this `positions` method as fallback.

## Cache

MVP:
- Backend short TTL cache, 5–15 minutes.
- If Pretix fails and cached value exists, return cached value with `stale: true`.
- If no cache exists, return an error and let UI hide/soft-fail.

Good options:
- Cloudflare Cache API or KV for ephemeral TTL stats.
- D1 is acceptable if the backend already has D1 and persistence is desired.

## Frontend types/helpers

Add to `src/lib/types.ts`:

```ts
export interface PretixEventStats {
  site_slug: string;
  pretix: {
    organizer_slug: string;
    event_slug: string;
    checkin_list_id: string;
    subevent_id: string | null;
  };
  registered_count: number;
  checked_in_count: number;
  attendance_rate: number | null;
  last_refreshed_at: string;
  stale: boolean;
}
```

Add to `src/lib/api.ts`:

```ts
fetchPretixEventStats(siteSlug: string): Promise<PretixEventStats>
```

This endpoint is public aggregate data, so auth token is optional/not required.

## UI component

Add:

```text
src/components/events/EventPretixStats.tsx
```

Props:

```ts
interface EventPretixStatsProps {
  siteSlug: string;
  eventDate?: string;
}
```

Behavior:
- Hydrate with `client:visible` where possible.
- Fetch stats after component becomes visible.
- Loading state: small skeleton cards.
- Error state: quietly hide stats or show “Attendance stats unavailable”.
- Stale state: show `Last updated ...` and optional stale indicator.
- Before event day: show registered count; hide or label checked-in count as “Check-ins open on event day”.
- During/after event: show registered, checked-in, and attendance rate.

Design:
- Mobile-first stacked cards at 360–414px.
- Desktop row of compact cards.
- Use Tailwind token classes (`bg-card`, `border-border`, `text-muted-foreground`, `text-primary`).
- No raw hex values.

## Event detail integration

Modify `src/pages/events/[...slug].astro`:

```astro
{event.data.pretixCheckinListId && (
  <EventPretixStats
    client:visible
    siteSlug={event.id}
    eventDate={event.data.date.toISOString()}
  />
)}
```

Place near event metadata or before the Pretix widget. Do not couple it to `PretixWidget`; stats should still work even if iframe/widget fails.

## Validation

Backend:
- unit test Pretix count parsing from fixture response
- test `has_checkin=true` request construction
- test stale cache behavior

Frontend:

```bash
nvm use 22
bun run build
bunx astro check
```

Manual tests:
- event with Pretix stats mapping
- event without Pretix mapping
- Pretix endpoint failure / stale cache
- before-event vs after-event display

## Exit criteria

- Event detail pages show registered and attended counts for configured Pretix events.
- No attendee/order PII reaches the browser.
- Events still render when stats endpoint fails.
- Existing Pretix iframe/widget behavior remains unchanged.
