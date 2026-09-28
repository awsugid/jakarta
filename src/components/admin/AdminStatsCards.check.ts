// Runnable self-check — no test framework needed:
//   bun src/components/admin/AdminStatsCards.check.ts
import { buildStatsCards } from "@/components/admin/AdminStatsCards";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const labels = (cards: ReturnType<typeof buildStatsCards>) =>
  cards.map((c) => c.label).join("|");

// Missing aggregate (loading / error / old backend) must show em dashes everywhere.
const missing = buildStatsCards(null, false);
ok("labels unchanged", labels(missing) === "Total|Finished|In Progress|Latest Submission");
ok("missing total is em dash", missing[0].value === "—");
ok("missing finished is em dash", missing[1].value === "—");
ok("missing in-progress is em dash", missing[2].value === "—");
ok("missing latest is em dash", missing[3].value === "—");

const fullStats = {
  total: 120,
  finished: 100,
  in_progress: 20,
  latest_submission: "2026-09-01T10:30:00Z",
};

// Full aggregate renders server-provided counts, never page-derived ones.
const full = buildStatsCards(fullStats, false);
ok("total from stats", full[0].value === "120");
ok("finished from stats", full[1].value === "100");
ok("in-progress from stats", full[2].value === "20");
ok("latest formatted, not raw ISO", full[3].value !== "—" && !full[3].value.includes("T"));

// latest_submission null / invalid stays em dash.
ok(
  "latest null is em dash",
  buildStatsCards(
    { total: 1, finished: 1, in_progress: 0, latest_submission: null },
    false,
  )[3].value === "—",
);
ok(
  "latest invalid is em dash",
  buildStatsCards(
    { total: 1, finished: 0, in_progress: 1, latest_submission: "not-a-date" },
    false,
  )[3].value === "—",
);

// Hints scope across all pages and mention filters when filters are active.
ok(
  "unfiltered hint",
  full.every((c) => c.hint === "across all pages"),
);
ok(
  "filtered hint",
  buildStatsCards(fullStats, true).every(
    (c) => c.hint === "all pages · filtered",
  ),
);

console.log(`AdminStatsCards: ${passed} checks passed`);
