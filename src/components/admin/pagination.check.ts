// Runnable check: bun ./src/components/admin/pagination.check.ts
import {
  computePagination,
  PAGE_SIZE,
  paginationSummary,
} from "@/components/admin/pagination";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    failures++;
    console.error(`FAIL ${name}: got ${g}, want ${w}`);
  }
}

if (PAGE_SIZE !== 50) {
  failures++;
  console.error(`FAIL PAGE_SIZE: got ${PAGE_SIZE}, want 50`);
}

// Known total, first page full.
check(
  "page 1 of 120",
  computePagination({ total: 120, itemCount: 50, offset: 0 }),
  { page: 1, from: 1, to: 50, totalLabel: "120", hasPrev: false, hasNext: true },
);

// Middle page.
check(
  "page 2 of 120",
  computePagination({ total: 120, itemCount: 50, offset: 50 }),
  { page: 2, from: 51, to: 100, totalLabel: "120", hasPrev: true, hasNext: true },
);

// Last partial page.
check(
  "page 3 of 120",
  computePagination({ total: 120, itemCount: 20, offset: 100 }),
  { page: 3, from: 101, to: 120, totalLabel: "120", hasPrev: true, hasNext: false },
);

// Exact multiple: offset+items == total must disable Next.
check(
  "exact multiple total=100",
  computePagination({ total: 100, itemCount: 50, offset: 50 }),
  { page: 2, from: 51, to: 100, totalLabel: "100", hasPrev: true, hasNext: false },
);

// Unknown total: full page implies Next may exist.
check(
  "unknown total full page",
  computePagination({ total: null, itemCount: 50, offset: 0 }),
  { page: 1, from: 1, to: 50, totalLabel: null, hasPrev: false, hasNext: true },
);

// Unknown total: partial page is the end.
check(
  "unknown total partial page",
  computePagination({ total: null, itemCount: 17, offset: 50 }),
  { page: 2, from: 51, to: 67, totalLabel: null, hasPrev: true, hasNext: false },
);

// Unknown total: empty page past the end still allows going back.
check(
  "unknown total empty page",
  computePagination({ total: null, itemCount: 0, offset: 50 }),
  { page: 2, from: 0, to: 50, totalLabel: null, hasPrev: true, hasNext: false },
);

// Empty dataset.
check(
  "empty dataset",
  computePagination({ total: 0, itemCount: 0, offset: 0 }),
  { page: 1, from: 0, to: 0, totalLabel: "0", hasPrev: false, hasNext: false },
);

// Data shrank: offset beyond total.
check(
  "offset beyond total",
  computePagination({ total: 30, itemCount: 0, offset: 50 }),
  { page: 2, from: 0, to: 50, totalLabel: "30", hasPrev: true, hasNext: false },
);

// Custom limit.
check(
  "custom limit",
  computePagination({ total: 25, itemCount: 10, offset: 10, limit: 10 }),
  { page: 2, from: 11, to: 20, totalLabel: "25", hasPrev: true, hasNext: true },
);

// Empty page with known total must not print "Showing 0–50 of 40".
check(
  "summary empty page known total",
  paginationSummary(
    computePagination({ total: 40, itemCount: 0, offset: 50 })
  ),
  "No responses on this page",
);

check(
  "summary known total",
  paginationSummary(
    computePagination({ total: 120, itemCount: 50, offset: 0 })
  ),
  "Showing 1–50 of 120",
);

check(
  "summary unknown total",
  paginationSummary(
    computePagination({ total: null, itemCount: 17, offset: 50 })
  ),
  "Showing 51–67",
);

if (failures > 0) {
  throw new Error(`${failures} pagination check(s) failed`);
}
console.log("pagination checks passed");
