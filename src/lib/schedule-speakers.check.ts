// Runnable self-check — no test framework needed:
//   bun src/lib/schedule-speakers.check.ts
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

// speakers array wins when present; blank names dropped.
ok(
  "array kept in order",
  normalizeScheduleSpeakers({
    speakers: [
      { name: "Ari", role: "SA" },
      { name: "Budi", company: "AWS" },
    ],
    speakerName: "Legacy",
  }).map((s) => s.name).join(",") === "Ari,Budi",
);
ok(
  "blank entries dropped",
  normalizeScheduleSpeakers({ speakers: [{ name: "   " }, { name: "Citra" }] }).length === 1,
);

// Legacy singular fields collapse into one entry; empty strings become undefined.
const legacy = normalizeScheduleSpeakers({
  speakerId: "dewi",
  speakerName: "Dewi",
  speakerRole: "Architect",
  speakerCompany: "",
  speakerAvatar: "",
  speakerSocialUrl: "https://linkedin.com/in/dewi",
});
ok("legacy fallback single", legacy.length === 1 && legacy[0].name === "Dewi");
ok("legacy ID preserved", legacy[0].id === "dewi");
ok("explicit empty array clears legacy", normalizeScheduleSpeakers({ speakers: [], speakerName: "Legacy" }).length === 0);
ok("legacy role mapped", legacy[0].role === "Architect");
ok("legacy blank company undefined", legacy[0].company === undefined);
ok("legacy social mapped", legacy[0].socialUrl === "https://linkedin.com/in/dewi");

// No speakers anywhere -> empty list, never a placeholder row.
ok(
  "empty stays empty",
  normalizeScheduleSpeakers({ speakers: null, speakerName: null }).length === 0,
);
ok("undefined fields ok", normalizeScheduleSpeakers({}).length === 0);

console.log(`schedule-speakers: ${passed} checks passed`);
