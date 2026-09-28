// Runnable self-check — no test framework needed:
//   bun src/components/admin/TagFilterMenu.check.ts
import {
  effectiveTagSelection,
  isAllCatalogSelected,
  selectAllTags,
  tagFilterSummary,
  toggleTag,
} from "@/components/admin/TagFilterMenu";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const CATALOG = ["DevOps", "Java", "Speaker"];

// Initialization: auto (null) follows the catalog — every tag selected.
ok(
  "initial selection is the whole catalog",
  effectiveTagSelection(null, CATALOG).join("|") === CATALOG.join("|"),
);
// Survey switch: back to auto, so the new survey's catalog applies untouched.
ok(
  "survey switch adopts the new catalog",
  effectiveTagSelection(null, ["A", "B"]).join("|") === "A|B",
);
// Manual clear persists: an explicit [] is respected, never re-filled.
ok(
  "manual clear stays untagged",
  effectiveTagSelection([], CATALOG).length === 0,
);
// Manual selection survives a catalog refresh (new tags don't reset it).
ok(
  "manual selection survives catalog change",
  effectiveTagSelection(["Java"], [...CATALOG, "New"]).join("|") === "Java",
);

// Summary: "All tags" only when the actual catalog is fully selected.
ok("all catalog selected reads All tags", tagFilterSummary(CATALOG, CATALOG) === "All tags");
ok(
  "all selected case-insensitive reads All tags",
  tagFilterSummary(["devops", "JAVA", "Speaker"], CATALOG) === "All tags",
);
ok("subset reads labels", tagFilterSummary(["Java"], CATALOG) === "Java");
ok(
  "empty with catalog still reads Untagged",
  tagFilterSummary([], CATALOG) === "Untagged",
);
ok(
  "empty catalog with selection reads labels",
  tagFilterSummary(["Java"], []) === "Java",
);

// Summary (no catalog context): legacy single-argument behavior.
ok("empty summary is Untagged", tagFilterSummary([]) === "Untagged");
ok("one label shown verbatim", tagFilterSummary(["Java"]) === "Java");
ok("two labels joined", tagFilterSummary(["Java", "DevOps"]) === "Java, DevOps");
ok(
  "three labels collapse with count",
  tagFilterSummary(["Java", "DevOps", "Speaker"]) === "Java, DevOps +1",
);
ok(
  "five labels count the tail",
  tagFilterSummary(["a", "b", "c", "d", "e"]) === "a, b +3",
);

// isAllCatalogSelected guards.
ok("empty catalog is never all", isAllCatalogSelected([], []) === false);
ok(
  "missing one label is not all",
  isAllCatalogSelected(["Java", "Speaker"], CATALOG) === false,
);

// Select all: fills the catalog, keeps extras, dedups case-insensitively.
ok(
  "select all fills missing labels",
  selectAllTags(["Java"], CATALOG).join("|") === CATALOG.join("|"),
);
ok(
  "select all keeps extras and dedups",
  selectAllTags(["Java", "Sponsor"], CATALOG).join("|") ===
    "DevOps|Java|Speaker|Sponsor",
);

// Toggle: case-insensitive per responseTags rules, additions append in order.
ok("toggle adds", toggleTag(["A"], "B").join("|") === "A|B");
ok("toggle removes exact", toggleTag(["A", "B"], "A").join("|") === "B");
ok(
  "toggle removes case-insensitive",
  toggleTag(["DevOps"], "devops").length === 0,
);
ok(
  "toggle matches after whitespace collapse",
  toggleTag(["Dev Ops"], "Dev  Ops").length === 0,
);

console.log(`TagFilterMenu: ${passed} checks passed`);
