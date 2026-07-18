# Phase 1 — Pretix Event Statistics on `/events` Details

Goal: show participant and attendance information on event detail pages using Pretix as source of truth.

## Current website context

Relevant files:

- `src/content.config.ts`
  - events collection already supports:
    - `registrationUrl`
    - `pretixUrl`
    - `pretixSubevent`
    - `pretixListType`
- `src/pages/events/[...slug].astro`
  - renders event detail page
  - embeds `PretixWidget` when `event.data.pretixUrl` exists
- `src/components/PretixWidget.tsx`
  - loads Pretix widget scripts/styles client-side

## Data mapping plan

Prefer explicit Pretix mapping fields over parsing URLs whenever possible.

Add optional fields to the events collection schema:

```ts
pretixOrganizerSlug?: string;
pretixEventSlug?: string;
pretixSubeventId?: string;
pretixCheckinListId?: string;
pretixTrackedItemIds?: number[];
```

Alternative minimal approach:
- derive organizer/event slugs from `pretixUrl`
- keep only `pretixCheckinListId` and `pretixTrackedItemIds` as extra frontmatter

Recommended: explicit fields to avoid URL parsing bugs and event-series ambiguity.

## Backend endpoint

Preferred in `jakarta-backend`:

```http
GET /api/events/:siteSlug/pretix-stats
```

Response shape:

```ts
interface PretixEventStats {
  site_slug: string;
  pretix_event: {
    organizer: string;
    event: string;
    subevent_id: string | null;
  };
  registered_count: number;
  checked_in_count: number;
  attendance_rate: number | null;
  capacity: number | null;
  last_refreshed_at: string;
  stale: boolean;
}
```

Return only aggregate numbers. Do not return attendee/order/customer details.

## Count definitions

Registered participant count:
- count Pretix order positions, not raw orders
- include only valid statuses agreed in Phase 0
- filter by configured tracked item IDs if registration includes non-attendee products
- filter by subevent when event series is used

Attendance count:
- count checked-in positions from the authoritative check-in list
- filter by same event/subevent/tracked items

Attendance rate:

```text
checked_in_count / registered_count
```

If `registered_count` is 0, return `attendance_rate: null`.

## Caching strategy

Phase 1A: simple backend cache TTL.
- Cache stats per `site_slug` for 5–15 minutes.
- If Pretix fails and cache exists, return stale cache with `stale: true`.
- If no cache exists, return a typed error and let UI show fallback.

Phase 1B later: scheduled refresh or webhooks.
- Add D1 table, e.g. `pretix_event_stats_cache`:

```sql
create table pretix_event_stats_cache (
  site_slug text primary key,
  organizer_slug text not null,
  event_slug text not null,
  subevent_id text,
  checkin_list_id text,
  registered_count integer not null,
  checked_in_count integer not null,
  capacity integer,
  raw_updated_at text,
  refreshed_at text not null
);
```

## Frontend API helper

Add type and function in `src/lib/types.ts` / `src/lib/api.ts`:

```ts
export interface PretixEventStats { ... }
export async function fetchPretixEventStats(siteSlug: string): Promise<PretixEventStats>
```

Stats endpoint is public aggregate data, so it does not need Google auth.

## UI component

Add `src/components/events/EventPretixStats.tsx`.

Behavior:
- client island, preferably `client:visible`
- receives `siteSlug` and optional initial display mode
- fetches `/api/events/:siteSlug/pretix-stats`
- shows 2–3 compact cards:
  - Registered
  - Checked in / Attended
  - Attendance rate, only if meaningful
- loading state: skeleton cards
- error state: hide or show “Stats unavailable” quietly
- stale state: small `Last updated ...` text

Design:
- mobile-first cards stacked on 360–414px
- desktop row layout inside event detail page
- use token classes (`bg-card`, `border-border`, `text-muted-foreground`, `text-primary`)
- no raw hex values

## Page integration

Modify `src/pages/events/[...slug].astro`:
- If event has Pretix mapping or `pretixUrl`, render stats component near title/date/location or before the registration widget.
- Keep existing Pretix widget unchanged.
- Do not block event content rendering if stats fail.

Example placement:

```astro
{event.data.pretixUrl && (
  <EventPretixStats client:visible siteSlug={event.id} />
)}
```

## Validation

Backend:
- unit test count aggregation with fixture orders/check-ins
- integration/Pretix POC for one event

Frontend:
- `nvm use 22`
- `bun run build`
- `bunx astro check`
- manual test one event with stats, one event without Pretix mapping, and Pretix failure state

## Exit criteria

- Event detail page displays registered and attended counts for configured Pretix events.
- Stats never expose attendee/order PII.
- Page still builds statically and works if Pretix stats endpoint is unavailable.
