// Runnable self-check — no test framework needed:
//   bun src/lib/responseTags.test.ts
import {
  addTag,
  checkTag,
  distinctTags,
  prepareTagsForSave,
  removeTag,
  sameTag,
} from "./responseTags";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const t1 = checkTag("  Hired  ");
ok("checkTag trims and accepts", t1.ok && t1.tag === "Hired");
ok("checkTag rejects blank", !checkTag("   ").ok);
ok("checkTag rejects 51 chars", !checkTag("a".repeat(51)).ok);
const t50 = checkTag("a".repeat(50));
ok("checkTag accepts exactly 50 chars", t50.ok && t50.tag.length === 50);
ok("checkTag rejects control chars", !checkTag("bad\u0000tag").ok);
ok("checkTag rejects newline", !checkTag("bad\ntag").ok);
ok("checkTag rejects C1 control U+0085", !checkTag("bad\u0085tag").ok);
ok("checkTag rejects C1 control U+009F", !checkTag("end\u009F").ok);
ok("checkTag accepts 50 emoji codepoints", checkTag("🎉".repeat(50)).ok);
ok("checkTag rejects 51 emoji codepoints", !checkTag("🎉".repeat(51)).ok);
ok("checkTag accepts 26 emoji (52 UTF-16 units)", (() => {
  const t = checkTag("🎉".repeat(26));
  return t.ok && t.tag.length === 52;
})());

ok("sameTag case-insensitive", sameTag("Hired", " HIRED "));
ok("sameTag collapses inner whitespace", sameTag("Follow  Up", " follow up "));
ok("checkTag collapses inner whitespace", (() => {
  const t = checkTag("two  spaces");
  return t.ok && t.tag === "two spaces";
})());
ok("addTag dedups case-insensitive", (() => {
  const first = addTag([], "Hired");
  const dup = addTag(first.tags, "HIRED");
  return first.error === null && dup.error !== null && dup.tags.join() === "Hired";
})());
ok("addTag dedups whitespace variants", addTag(["Follow Up"], "follow   up").error !== null);
ok("addTag reuses catalog spelling (case-insensitive)", (() => {
  const res = addTag([], "  vip ", ["VIP"]);
  return res.error === null && res.tags.join() === "VIP";
})());
ok("addTag reuses catalog spelling (whitespace collapsed)", (() => {
  const res = addTag([], "follow   up", ["Follow Up"]);
  return res.error === null && res.tags.join() === "Follow Up";
})());
ok("addTag keeps new spelling when catalog differs", (() => {
  const res = addTag([], "New Tag", ["VIP"]);
  return res.error === null && res.tags.join() === "New Tag";
})());
ok("addTag does not fuzzy-merge partial matches", (() => {
  const res = addTag([], "Hire", ["Hired"]);
  return res.error === null && res.tags.join() === "Hire";
})());
ok("addTag enforces max 20", (() => {
  let tags: string[] = [];
  for (let i = 0; i < 20; i++) tags = addTag(tags, `tag-${i}`).tags;
  return tags.length === 20 && addTag(tags, "overflow").error !== null;
})());
ok("removeTag matches case-insensitively", removeTag(["Hired"], "hired").length === 0);

const prep = prepareTagsForSave([" A ", "a", " B "]);
ok(
  "prepareTagsForSave trims + dedups",
  prep.error === null && prep.tags.join("|") === "A|B",
);
ok("prepareTagsForSave rejects control char", prepareTagsForSave(["ok", "x\u007Fy"]).error !== null);
ok("prepareTagsForSave rejects >20", prepareTagsForSave(Array.from({ length: 21 }, (_, i) => `t${i}`)).error !== null);

ok(
  "distinctTags dedups + sorts",
  distinctTags(["B", " a ", "A", ""]).join("|") === "a|B",
);
ok(
  "distinctTags dedups whitespace variants",
  distinctTags(["Follow  Up", "follow up"]).join("|") === "Follow  Up",
);

console.log(`responseTags: ${passed} checks passed`);
