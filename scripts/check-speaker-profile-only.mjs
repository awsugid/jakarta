// Focused check: speaker surfaces are profile-only (no talk-field duplication).
// Run: node scripts/check-speaker-profile-only.mjs
import { readFileSync } from "node:fs";

const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "");
const must = (cond, msg) => {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
};

const talkFieldRe = /talkTitle|talkFormat|topicImageUrl|getTalkFormatBadgeClass|TALK_FORMAT_PRESETS/;

const manager = stripComments(
  readFileSync("src/components/admin/speaker-directory/SpeakerDirectoryManager.tsx", "utf8"),
).replace(/^type SpeakerProfilePayload.*$/m, ""); // compat shim line is the one allowed mention
const carousel = stripComments(
  readFileSync("src/components/speakers/SpeakerCarousel.tsx", "utf8"),
);
const eventPage = stripComments(
  readFileSync("src/pages/events/[...slug].astro", "utf8"),
);

// 1. No talk fields in entry/display/filter/payload of scoped speaker surfaces
for (const [name, src] of [
  ["SpeakerDirectoryManager", manager],
  ["SpeakerCarousel", carousel],
  ["events/[...slug].astro", eventPage],
]) {
  must(!talkFieldRe.test(src), `${name} still references talk fields (talkTitle/talkFormat/topicImageUrl)`);
}

// 2. No required talk form source: labels and required talk inputs are gone
must(!manager.includes("Talk / Session Title"), "manager still has Talk Title form label");
must(!manager.includes('htmlFor="sp-format"'), "manager still has Talk Format form field");

// 3. Profile essentials retained (no over-deletion)
for (const field of ["photoUrl", "bio", "socialUrl", "displayOrder"]) {
  must(manager.includes(field), `manager lost profile field ${field}`);
}
for (const field of ["photoUrl", "bio", "speaker.name"]) {
  must(carousel.includes(field), `carousel lost profile element ${field}`);
}

// 4. Legacy compat untouched: lib types still declare the optional-ized talk fields
const types = readFileSync("src/lib/types.ts", "utf8");
for (const field of ["talkTitle", "talkFormat", "topicImageUrl"]) {
  must(types.includes(field), `src/lib/types.ts no longer declares ${field} (legacy compat broken)`);
}

console.log("PASS: speaker surfaces are profile-only; legacy talk fields remain type-compat only");
