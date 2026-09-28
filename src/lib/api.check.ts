// Runnable self-check — no test framework needed:
//   bun src/lib/api.check.ts
import { buildAdminResponsesQuery } from "@/lib/api";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const tags = (q: string) => [...q.matchAll(/(?:^|&)tag=([^&]*)/g)].map((m) => m[1]);

// Bare request keeps the legacy shape: no tag params, no untagged flag.
ok("bare query", buildAdminResponsesQuery("s1") === "surveyId=s1");

// Pagination + finished pass through unchanged.
ok(
  "paging params",
  buildAdminResponsesQuery("s1", { limit: 10, offset: 20, finished: "true" }) ===
    "surveyId=s1&limit=10&offset=20&finished=true",
);

// Multi-tag OR contract: repeated tag= params in selection order.
const multi = buildAdminResponsesQuery("s1", { tags: ["Java", "DevOps"] });
ok("repeated tag params", tags(multi).join("|") === "Java|DevOps");
ok("no untagged with tags", !multi.includes("untagged="));

// Untagged serializes as =true only when true (absent when false/undefined).
ok(
  "untagged true",
  buildAdminResponsesQuery("s1", { untagged: true }) === "surveyId=s1&untagged=true",
);
ok(
  "untagged false absent",
  buildAdminResponsesQuery("s1", { untagged: false }) === "surveyId=s1",
);
ok(
  "empty tags array sends nothing",
  buildAdminResponsesQuery("s1", { tags: [] }) === "surveyId=s1",
);

// Legacy single tag param still supported alongside multi-tag.
const legacy = buildAdminResponsesQuery("s1", { tag: "Java", tags: ["DevOps"] });
ok("legacy tag kept", tags(legacy).join("|") === "Java|DevOps");

// Blank labels never reach the wire.
ok("blank labels skipped", tags(buildAdminResponsesQuery("s1", { tags: ["", "A"] })).join("|") === "A");

// Falsy paging values stay omitted, matching the previous behavior.
ok(
  "zero limit omitted",
  buildAdminResponsesQuery("s1", { limit: 0 }) === "surveyId=s1",
);

console.log(`api: ${passed} checks passed`);
