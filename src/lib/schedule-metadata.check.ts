// Runnable self-check — no test framework needed:
//   bun src/lib/schedule-metadata.check.ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MetadataField } from "../components/admin/schedule/MetadataField";
import {
  LANGUAGE_SUGGESTIONS,
  LEVEL_SUGGESTIONS,
  addMetadataValues,
  formatMetadataList,
  toggleMetadataValue,
  metadataListError,
  parseMetadataList,
  sessionizeCategoryValues,
} from "./schedule-metadata";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

// Parsing: trim, drop empties, dedupe case-insensitively (first spelling wins)
const langs = parseMetadataList(" English , bahasa indonesia ,,English, ");
ok("bilingual parse", JSON.stringify(langs) === JSON.stringify(["English", "bahasa indonesia"]));
ok("empty input", parseMetadataList("  ,, ,") .length === 0);
ok("empty string", parseMetadataList("").length === 0);

// Levels absent upstream stays absent — never fabricated
ok("levels absent", parseMetadataList("").length === 0);

// Roundtrip editing: stored values -> input text -> parse -> identical
const stored = { languages: ["English", "Bahasa Indonesia"], levels: [] as string[] };
const edited = {
  languages: parseMetadataList(formatMetadataList(stored.languages) + ", English"),
  levels: parseMetadataList(formatMetadataList(stored.levels)),
};
ok("languages roundtrip", JSON.stringify(edited.languages) === JSON.stringify(["English", "Bahasa Indonesia"]));
ok("levels roundtrip stays empty", edited.levels.length === 0);
ok("formatMetadataList null-safe", formatMetadataList(null) === "" && formatMetadataList(undefined) === "");

// Validation mirrors the backend boundary
ok("no error for valid", metadataListError(["English"]) === null);
ok("error over 20 values", metadataListError(Array.from({ length: 21 }, (_, i) => `v${i}`)) !== null);
ok("error over 100 chars", metadataListError(["x".repeat(101)]) !== null);
ok("no error at 100 chars", metadataListError(["x".repeat(100)]) === null);

// Sessionize categories: Language multiselect in, Level absent -> []
const categories = [
  { name: "Language", categoryItems: [{ name: "English" }, { name: "Bahasa Indonesia" }] },
  { name: "Session format", categoryItems: [{ name: "Talk (45 min)" }] },
];
ok(
  "category language values",
  JSON.stringify(sessionizeCategoryValues(categories, "Language")) === JSON.stringify(["English", "Bahasa Indonesia"]),
);
ok("category level absent", sessionizeCategoryValues(categories, "Level").length === 0);
ok("category null-safe", sessionizeCategoryValues(null, "Language").length === 0);

// Editor chip helpers: no defaults, dedupe, bilingual, custom verbatim, clear
ok("suggestions are labels only", !LEVEL_SUGGESTIONS.includes("") && LANGUAGE_SUGGESTIONS.length === 2);
const bi = toggleMetadataValue(toggleMetadataValue([], "English"), "Bahasa Indonesia");
ok("bilingual select", JSON.stringify(bi) === JSON.stringify(["English", "Bahasa Indonesia"]));
ok("toggle off any casing", JSON.stringify(toggleMetadataValue(["english"], "English")) === "[]");
ok("custom dedupe vs existing", JSON.stringify(addMetadataValues(bi, " english , Javanese,javanese ")) === JSON.stringify([...bi, "Javanese"]));
ok("level code verbatim", JSON.stringify(addMetadataValues([], "100 - Introductory")) === JSON.stringify(["100 - Introductory"]));
ok("blank custom is no-op", addMetadataValues([], "  , ").length === 0);
ok("existing comma value preserved", JSON.stringify(addMetadataValues(["A, B"], "C")) === JSON.stringify(["A, B", "C"]));
ok("clear is []", JSON.stringify(toggleMetadataValue(["Beginner"], "Beginner")) === "[]");

// Rendered input: unset field shows "Not set", nothing preselected; set field shows Clear
const render = (values: string[]) =>
  renderToStaticMarkup(
    createElement(MetadataField, { label: "Level", values, onChange: () => {}, suggestions: LEVEL_SUGGESTIONS, hint: "h", placeholder: "p" }),
  );
const unset = render([]);
ok("unset shows Not set", unset.includes("Not set") && !unset.includes("Clear"));
ok("unset nothing pressed", !unset.includes('aria-pressed="true"') && unset.split('aria-pressed="false"').length === 4);
const set = render(["Beginner", "100 - Introductory"]);
ok("set suggestion pressed", set.split('aria-pressed="true"').length === 2);
ok("custom chip removable", set.includes("Remove level 100 - Introductory") && set.includes("Clear"));

console.log(`PASS schedule-metadata (${passed})`);
