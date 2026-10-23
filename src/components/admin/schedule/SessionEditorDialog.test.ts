// Runnable self-check — no test framework needed:
//   bun src/components/admin/schedule/SessionEditorDialog.test.ts
import { addMinutesWib, formatDuration, hasPendingSubform, joinWib, minutesBetween } from "./SessionEditorDialog";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

ok("join full", joinWib("2026-11-07", "09:30") === "2026-11-07T09:30");
ok("join missing time", joinWib("2026-11-07", "") === "");
ok("join missing date", joinWib("", "09:30") === "");
ok("add same day", JSON.stringify(addMinutesWib("2026-11-07", "09:30", 45)) === '{"date":"2026-11-07","time":"10:15"}');
ok("add past midnight", JSON.stringify(addMinutesWib("2026-11-07", "23:30", 60)) === '{"date":"2026-11-08","time":"00:30"}');
ok("add incomplete", addMinutesWib("", "09:30", 30) === null);
ok("between", minutesBetween("2026-11-07T09:30", "2026-11-07T11:00") === 90);
ok("between empty", minutesBetween("", "2026-11-07T11:00") === null);
ok("fmt", formatDuration(90) === "1 h 30 min" && formatDuration(60) === "1 h" && formatDuration(45) === "45 min");

// Pending inline sub-forms (dirty guard)
const spkAtOpen = { name: "", role: "Speaker", company: "", photoUrl: "" };
ok("spk closed never dirty", !hasPendingSubform(false, { ...spkAtOpen, name: "Ari" }, spkAtOpen));
ok("spk mere open not dirty", !hasPendingSubform(true, spkAtOpen, spkAtOpen));
ok("spk query prefill not dirty", !hasPendingSubform(true, { ...spkAtOpen, name: "Ari" }, { ...spkAtOpen, name: "Ari" }));
for (const k of Object.keys(spkAtOpen) as (keyof typeof spkAtOpen)[]) {
  ok(`spk ${k} edit dirty`, hasPendingSubform(true, { ...spkAtOpen, [k]: spkAtOpen[k] + "x" }, spkAtOpen));
}
ok("spk role cleared dirty", hasPendingSubform(true, { ...spkAtOpen, role: "" }, spkAtOpen));
ok("spk whitespace only not dirty", !hasPendingSubform(true, { ...spkAtOpen, company: "  " }, spkAtOpen));
ok("format open empty not dirty", !hasPendingSubform(true, { name: "" }));
ok("format typed dirty", hasPendingSubform(true, { name: "Lightning" }));
ok("format closed not dirty", !hasPendingSubform(false, { name: "Lightning" }));

console.log(`ok ${passed} checks`);
