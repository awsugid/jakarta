# Community Statistics Frontend — Pretix Live Demographics

## Context
Backend extending `GET /api/community/statistics` with current-year metrics from
Pretix. Frontend must render new optional fields gracefully (empty array /
zero-count / null when Pretix down or no events yet).

## Files Touched
- `src/lib/types.ts` — added `LabelCount` interface, extended `CommunityStatistics`
  with 4 optional fields:
  - `participantGenderDistributionThisYear?: { male, female }`
  - `positionDistributionThisYear?: LabelCount[]`
  - `topCompaniesThisYear?: LabelCount[]`
  - `avgAwsExperienceYears?: number | null`
  All optional (`?`) so old backend payload still typechecks before deploy.
- `src/components/StatisticsCharts.tsx` — added 4 cards to existing 2-col grid
  (now 8 cards = 4 rows of 2). All reuse `Card`/`ChartContainer`/`CHART_COLORS`
  pattern.

## New Cards
1. **Gender Distribution (Live)** — PieChart, orange/teal cells, falls back to
   "No data yet" when both male+female are 0.
2. **Top Roles** — horizontal BarChart (`layout="vertical"`, `YAxis width=120`),
   orange fill, `positionConfig`. Empty → "No data yet".
3. **Top Companies** — horizontal BarChart, `companyConfig`, labels truncated
   to 20 chars with `…`. Top 10. Empty → "No data yet".
4. **AWS Experience** — stat card, big number `toFixed(1)` + "years"; `null` →
   "—".

## Section Header
Added subtitle under existing description:
`Current-year metrics update hourly from Pretix.` — signals live vs historical.

## Empty-state Contract
Backend returns `[]` / `{male:0,female:0}` / `null` when Pretix unavailable.
Frontend treats each dataset independently with "No data yet" placeholder — no
chart render on zero data.

## Validation
- `bunx astro check`: 0 new errors (pre-existing in `test-schedule.astro` and
  `VolunteerRoles.tsx` ignored per AGENT.md).
- `bun run build`: ✓ 20 pages built.

## Notes
- Optional fields mean no migration coordination needed — deploy backend any
  time, frontend renders new cards when data arrives.
- Mobile-first: YAxis width 120 leaves enough label room on 360px without
  clipping; chart container responsive.
- No new deps; recharts `Bar`/`BarChart` already imported.
