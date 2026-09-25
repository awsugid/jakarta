// Client-side tag rules — mirrors the backend validation contract:
// max 20 tags, trimmed labels 1..50 chars, no control characters,
// dedup case-insensitive preserving the first spelling.

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 50;

// C0 (U+0000..U+001F), DEL (U+007F) and C1 (U+0080..U+009F) controls.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

/** Codepoint length (UTF-16 pairs like emoji count as 1), mirroring backend. */
function codepointLength(s: string): number {
  return Array.from(s).length;
}

export type TagCheck = { ok: true; tag: string } | { ok: false; error: string };

/** Validate one raw label: trim, length 1..50, no control characters. */
export function checkTag(raw: string): TagCheck {
  const tag = raw.trim();
  if (!tag) return { ok: false, error: "Tag can't be empty." };
  if (codepointLength(tag) > MAX_TAG_LENGTH) {
    return { ok: false, error: `Tag must be ${MAX_TAG_LENGTH} characters or fewer.` };
  }
  if (CONTROL_CHARS.test(tag)) {
    return { ok: false, error: "Tag can't contain control characters." };
  }
  return { ok: true, tag };
}

/** Case-insensitive equality used for dedup; first spelling wins. */
export function sameTag(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Add one tag immutably; enforces dedup + max count. */
export function addTag(
  tags: string[],
  raw: string,
): { tags: string[]; error: string | null } {
  const check = checkTag(raw);
  if (!check.ok) return { tags, error: check.error };
  if (tags.some((t) => sameTag(t, check.tag))) {
    return { tags, error: `"${check.tag}" is already added.` };
  }
  if (tags.length >= MAX_TAGS) {
    return { tags, error: `A response can have at most ${MAX_TAGS} tags.` };
  }
  return { tags: [...tags, check.tag], error: null };
}

/** Remove one tag (case-insensitive match) immutably. */
export function removeTag(tags: string[], label: string): string[] {
  return tags.filter((t) => !sameTag(t, label));
}

/** Final pass before PUT: validate every entry, dedup case-insensitive. */
export function prepareTagsForSave(
  raw: string[],
): { tags: string[]; error: string | null } {
  const out: string[] = [];
  for (const entry of raw) {
    const check = checkTag(entry);
    if (!check.ok) return { tags: raw, error: check.error };
    if (!out.some((t) => sameTag(t, check.tag))) out.push(check.tag);
  }
  if (out.length > MAX_TAGS) {
    return { tags: raw, error: `A response can have at most ${MAX_TAGS} tags.` };
  }
  return { tags: out, error: null };
}

/** Distinct, sorted labels for the dashboard dropdown (exact case preserved). */
export function distinctTags(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out.sort((a, b) => a.localeCompare(b));
}
