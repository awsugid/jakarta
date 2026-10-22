// Session metadata (languages / levels) helpers. Pure — no React, no fetch.

export const METADATA_MAX_VALUES = 20;
export const METADATA_MAX_LENGTH = 100;

/**
 * Comma-separated editor input -> clean list: trims, drops empties, dedupes
 * case-insensitively (first spelling wins). " English , bahasa ,, " -> ["English", "bahasa"].
 */
export function parseMetadataList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** Mirrors backend trust-boundary validation: at most 20 values, 100 chars each. */
export function metadataListError(values: string[]): string | null {
  if (values.length > METADATA_MAX_VALUES) {
    return `Keep to at most ${METADATA_MAX_VALUES} values per field.`;
  }
  const tooLong = values.find((v) => v.length > METADATA_MAX_LENGTH);
  return tooLong ? `“${tooLong.slice(0, 24)}…” is longer than ${METADATA_MAX_LENGTH} characters.` : null;
}

/** Compact display: "English, Bahasa Indonesia"; "" when empty/absent. */
export function formatMetadataList(values: string[] | null | undefined): string {
  return (values ?? []).join(", ");
}

/**
 * Values of one Sessionize category (matched by name, case-insensitive).
 * Upstream currently only has "Language"; a "Level" category renders too if
 * organizers add one. Never fabricates values: absent category -> [].
 */
export function sessionizeCategoryValues(
  categories: { name: string; categoryItems: { name: string }[] }[] | null | undefined,
  categoryName: string,
): string[] {
  const key = categoryName.toLowerCase();
  const match = (categories ?? []).find((c) => (c.name || "").trim().toLowerCase() === key);
  return (match?.categoryItems ?? [])
    .map((item) => (item.name || "").trim())
    .filter(Boolean);
}
