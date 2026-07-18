# Community Statistics Demographics — Backend

Project: `jakarta-backend` (Rust Cloudflare Worker, worker 0.8).
Endpoint: `GET /api/community/statistics` — reused existing 1h Cache API path at
`https://jakarta-backend.local/api/community/statistics` (see `src/http/routes.rs`).
No route changes; only service + client extended.

## Pretix client — new method

File: `src/pretix/client.rs`
Method: `PretixClient::get_all_order_positions(organizer, event) -> Result<Vec<serde_json::Value>, String>`
- Endpoint: `GET /api/v1/organizers/{organizer}/events/{event}/orderpositions/?page_size=100`
- Follows top-level `next` URL until null. Safety cap 20 pages (2000 positions).
- Headers: `Authorization: Token {token}`, `Accept: application/json` (same as other methods).
- Non-200 → Err with truncated body (256 chars).
- Returns raw position Values (callers extract fields).
- Helper struct `OrderPositionsPage { next: Option<String>, results: Vec<Value> }` (both `#[serde(default)]`).

## Statistics service — extended struct

File: `src/statistics/service.rs`

`CommunityStatistics` gained 4 new fields, all `#[serde(default)]` so the legacy
D1 baseline JSON (singleton row id=1 in `community_statistics.data`) still parses:

```rust
pub struct CommunityStatistics {
    // existing
    pub participant_num_of_the_year: Vec<YearTotal>,
    pub event_per_year: Vec<YearTotal>,
    pub participant_gender_distribution_last_year: GenderDistribution,
    pub participant_background_distribution: BackgroundDistribution,
    // NEW — current-year, live from Pretix
    pub participant_gender_distribution_this_year: GenderDistribution, // male/female as percentages 0-100
    pub position_distribution_this_year: Vec<LabelCount>,              // top 8, sorted desc
    pub top_companies_this_year: Vec<LabelCount>,                      // top 10, RAW (no normalization)
    pub avg_aws_experience_years: Option<f64>,                         // 1-decimal
}
```

New shared shape:
```rust
pub struct LabelCount { pub label: String, pub count: u64 }
```

`GenderDistribution` gained `#[derive(Default)]` to satisfy `#[serde(default)]`.

## Aggregation logic

Runs inside the SAME `for ev in &events` loop in `get_community_statistics`
(no second event-list fetch). Best-effort: on `get_all_order_positions` error
the event is skipped (logged via `console_log!`), accumulators keep prior values.

Pretix question identifiers (AWSUserGroupJakarta, verified live):
- `TY7STNVR` — Gender → tallied into `gender_male` / `gender_female`
  (lowercase substring match: female wins on `contains("female")` OR
  (`contains('f')` AND NOT `contains("trans")`); else male).
- `JYJLKVCH` — Company/Organization (text) → `company_counts` HashMap, RAW.
- `UVXYZSPW` — Position (choice) → `position_counts` HashMap.
- `GPTKPG9V` — Year of Experience Using AWS (number) → `aws_exp_sum` / `aws_exp_n`.

Also reads `position.company` directly when present (some positions omit the
question answer but populate the field).

Sort: desc by count, alpha tiebreak. Position top 8, Company top 10.
Gender emitted as percentages rounded to 1 decimal (matches
`participantGenderDistributionLastYear` shape for frontend chart reuse).
Avg AWS experience = `round1(sum/n)`.

## Privacy

Aggregate counts only. No PII logged. Company names + positions never appear
in `console_log!`. Only the event slug is logged on error.

## Response shape (example, current year live)

```json
{
  "participantNumOfTheYear": [{"year": 2025, "total": 464}],
  "eventPerYear": [{"year": 2025, "total": 5}],
  "participantGenderDistributionLastYear": {"male": 80.0, "female": 20.0},
  "participantBackgroundDistribution": {"professional": 70.0, "student": 30.0},
  "participantGenderDistributionThisYear": {"male": 84.1, "female": 15.9},
  "positionDistributionThisYear": [
    {"label": "Student", "count": 97},
    {"label": "Backend Developer", "count": 60}
  ],
  "topCompaniesThisYear": [
    {"label": "Trisatya Media Berkat", "count": 14}
  ],
  "avgAwsExperienceYears": 3.2
}
```

## Constraints honored

- No new crate deps (serde / serde_json / worker already present).
- Frontend untouched.
- No commit, no push.
- Existing baseline merge + total_registered + event count logic preserved.

## Validate

`cargo check` → clean (cargo_exit=0).
