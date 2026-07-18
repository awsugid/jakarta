# Community Statistics — Frontend Live Fetch

## Goal
Replace static `public/data/statistic.json` import in homepage with live fetch to backend `GET /api/community/statistics`.

## Backend Contract
Endpoint: `GET /api/community/statistics` → 200 JSON, camelCase:
```ts
interface CommunityStatistics {
  participantNumOfTheYear: { year: number; total: number }[];
  eventPerYear: { year: number; total: number }[];
  participantGenderDistributionLastYear: { male: number; female: number };
  participantBackgroundDistribution: { professional: number; student: number };
}
```
Backend agent seeds D1 from `public/data/statistic.json` (kept as reference, do NOT delete).

## Files Changed
1. `src/lib/types.ts` — appended `CommunityStatistics` interface.
2. `src/lib/api.ts` — imported `CommunityStatistics`, appended `fetchCommunityStatistics()` using existing `apiFetch` helper (no auth headers — endpoint is public).
3. `src/components/StatisticsCharts.tsx` — full refactor:
   - Added `"use client"`.
   - No-props signature: `StatisticsCharts({}: StatisticsChartsProps = {})`.
   - Internal state: `data`, `error`, `isLoaded` (existing 100ms timer kept).
   - `useEffect` fetches via `fetchCommunityStatistics`, sets data or error flag, uses `cancelled` guard.
   - Removed inner `StatisticsData` interface → uses imported `CommunityStatistics`.
   - Derived `isLoading = !data || !isLoaded` replaces all `!isLoaded` checks → skeleton reused for initial load + fetch pending.
   - Error state: single centered muted `Card` with text "Community statistics unavailable. Please try again later." — does not crash page.
   - All chart code (LineChart, BarChart, PieCharts, configs, CHART_COLORS, layout, Tailwind classes) preserved verbatim.
   - Data access guarded with `??` (e.g. `data?.participantNumOfTheYear ?? []`).
4. `src/pages/index.astro` — removed `import statisticsData from "../../public/data/statistic.json"`, removed `data` prop: `<StatisticsCharts client:visible />`.

## Validation
- `bunx astro check`: 0 errors in touched files. Only pre-existing `test-schedule.astro` errors remain (ignored per task). Pre-existing unused-import warnings (`Label`, `ResponsiveContainer`, `YAxis`) in StatisticsCharts carried over from original — not regressions.
- `bun run build`: ✓ 20 pages built clean.

## Constraints Honored
- Mobile-first layout untouched (grid `md:grid-cols-2`, skeleton heights identical).
- Tailwind token classes only (`bg-background`, `text-muted-foreground`, `bg-card/50`, `border-border/50`).
- `cn()` not needed (no conditional classes added beyond existing).
- No backend files touched.
- No commit, no push, no `bun dev`.
- Import order: third-party (react, recharts) → `@/` aliases (ui/chart, ui/card, lib/api, lib/types).

## API Helper Notes
- `fetchCommunityStatistics()` uses bare `apiFetch` without `authHeaders()` — matches public nature of community stats (consistent with `fetchForms`, `fetchPretixEventStats`).
- Base URL via `PUBLIC_BACKEND_API_URL` env (existing pattern in `api.ts`).

## Error Path
- Network failure / non-2xx → `apiFetch` throws → catch block sets `error=true` → muted card render. Page survives.
- Loading state never layout-shifts: `isLoading` flag covers both mount-delay + fetch-pending with identical skeleton markup.

## Follow-ups
- Backend agent must land `GET /api/community/statistics` returning the camelCase shape. Until then homepage shows error card (graceful).
- Consider adding retry button or stale-while-revalidate cache if backend latency becomes an issue (not done now, YAGNI).
