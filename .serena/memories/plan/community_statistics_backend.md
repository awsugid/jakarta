# Community Statistics Backend — `GET /api/community/statistics`

## Layout (jakarta-backend, Rust worker 0.8 + D1)

- **Migration**: `migrations/0003_community_statistics.sql` — singleton table `community_statistics(id PK DEFAULT 1 CHECK(id=1), data TEXT, updated_at TEXT)`. Seed row id=1 holds baseline JSON: 2021–2025 participant/event totals + gender/background distributions (camelCase keys matching frontend `StatisticsCharts.tsx`).
- **Pretix additions** (`src/pretix/client.rs`):
  - `PretixClient::list_events_for_year(organizer, year) -> Result<Vec<PretixEventSummary>, String>` — GET `/api/v1/organizers/{org}/events/?date_from_after={Y}-01-01T00:00:00Z&date_from_before={Y}-12-31T23:59:59Z&page_size=100`. First page only; logs warning via `worker::console_log!` if `count > 100`.
  - `PretixEventSummary { slug, name }` defined in `src/pretix/orders.rs`.
  - `extract_event_name` handles Pretix `name` being either string or `{"default","en"}` object; prefers `default` → `en` → "".
  - Helpers `EventsListResponse` / `EventsListEntry` at bottom of client.rs reuse existing header/request pattern.
- **Service**: `src/statistics/service.rs` (module `src/statistics/mod.rs`).
  - `get_community_statistics(config, db) -> Result<CommunityStatistics, AppError>`:
    1. `load_baseline(db)` — read singleton row, `serde_json::from_str` into `CommunityStatistics`.
    2. `current_year_utc()` via `js_sys::Date::new(...).get_full_year()` (std::time panics in Workers).
    3. `list_events_for_year` → for each event reuse `get_first_checkin_list_id` + `get_position_count(org, evt, list, has_checkin=false, subevent=None, item_ids=None)`. Sum via `saturating_add`.
    4. Strip baseline entries with `year == current_year`, append computed, sort ascending.
    5. On Pretix failure: `console_log!` warning, return baseline unchanged (graceful degrade → stale-while-error at route layer).
  - Structs `YearTotal`, `GenderDistribution`, `BackgroundDistribution`, `CommunityStatistics` all `#[serde(rename_all = "camelCase")]` so emitted JSON uses `participantNumOfTheYear`, `eventPerYear`, `participantGenderDistributionLastYear`, `participantBackgroundDistribution` — matches frontend expectations.
- **Route** (`src/http/routes.rs`): `.get_async("/api/community/statistics", ...)` registered BEFORE `.options("/api/*rest", ...)`. Public, no auth.
  - Cloudflare Cache API (`worker::Cache::default()`), key `https://jakarta-backend.local/api/community/statistics`. Cache-first: `cache.get(key, ignore_method=true)`; on miss compute → `json_success` → set `Cache-Control: public, max-age=3600` on cloned response → `cache.put(key, resp)` → `with_cors(resp, &config.allowed_origins)`.
  - worker 0.8 signatures: `Cache::get(key, ignore_method: bool) -> Result<Option<Response>>`, `Cache::put(key, response) -> Result<()>`, `Response::cloned(&mut self)`.

## JSON shape served to frontend
```json
{
  "participantNumOfTheYear":   [ {"year":2021,"total":228}, ..., {"year":<current>,"total":<live>} ],
  "eventPerYear":              [ {"year":2021,"total":8},   ..., {"year":<current>,"total":<live>} ],
  "participantGenderDistributionLastYear": { "male": 87.9, "female": 12.1 },
  "participantBackgroundDistribution":     { "professional": 80.05, "student": 19.85 }
}
```

## Constraints honored
- No new crates. Reuses `serde`, `serde_json`, `worker`, `js-sys`, `wasm-bindgen`.
- Reuses existing Pretix helpers `get_first_checkin_list_id`, `get_position_count`.
- No PII logged — only counts + status.
- `cargo check` clean. Frontend untouched. No commit/push/wrangler run.
