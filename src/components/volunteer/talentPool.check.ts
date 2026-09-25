// Runnable self-check — no test framework needed:
//   bun src/components/volunteer/talentPool.check.ts
import {
  applyCtaMode,
  applyDialogForms,
  isTalentPoolForm,
} from "@/components/volunteer/talentPool";
import type { FormInfo } from "@/lib/types";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const form = (over: Partial<FormInfo>): FormInfo => ({
  kind: "volunteer",
  slug: "logistics",
  title: "Logistics",
  description: null,
  survey_id: "s1",
  is_active: true,
  opens_at: null,
  closes_at: null,
  editable_until: null,
  ...over,
});

// Pool detection: volunteer inactive = talent pool; volunteer active and any
// speaker form are never pool.
ok("volunteer inactive is pool", isTalentPoolForm("volunteer", form({ is_active: false })));
ok("volunteer active is not pool", !isTalentPoolForm("volunteer", form({ is_active: true })));
ok("speaker inactive is not pool", !isTalentPoolForm("speaker", form({ is_active: false, kind: "speaker" })));

// Dialog listing: volunteers include inactive (pool) forms, speakers exclude them,
// other kinds are filtered out.
const forms = [
  form({ slug: "a", is_active: true }),
  form({ slug: "b", is_active: false }),
  form({ slug: "c", is_active: false, kind: "speaker" }),
];
ok(
  "volunteer dialog lists active + pool",
  applyDialogForms("volunteer", forms).map((f) => f.slug).join(",") === "a,b",
);
ok(
  "speaker dialog lists active only",
  applyDialogForms("speaker", forms).map((f) => f.slug).join(",") === "",
);
ok(
  "speaker dialog keeps its active form",
  applyDialogForms("speaker", [...forms, form({ slug: "d", is_active: true, kind: "speaker" })])
    .map((f) => f.slug)
    .join(",") === "d",
);

// Hero CTA: recruiting wins, pool-only when only inactive volunteer forms, none otherwise.
ok("cta apply", applyCtaMode(1, 3) === "apply");
ok("cta pool", applyCtaMode(0, 3) === "pool");
ok("cta none", applyCtaMode(0, 0) === "none");

console.log(`talentPool: ${passed} checks passed`);
