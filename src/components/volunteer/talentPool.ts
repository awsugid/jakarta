import type { FormInfo } from "@/lib/types";

/**
 * Volunteer forms stay submittable while inactive — that state is the Talent
 * Pool. Speaker forms keep the old contract: inactive = closed.
 */
export function isTalentPoolForm(kind: string, form: FormInfo): boolean {
  return kind === "volunteer" && !form.is_active;
}

/** Forms the public apply dialog may list: every volunteer form, only active speaker forms. */
export function applyDialogForms(
  kind: string,
  forms: FormInfo[],
): FormInfo[] {
  return forms.filter(
    (f) => f.kind === kind && (kind === "volunteer" || f.is_active),
  );
}

export type ApplyCtaMode = "apply" | "pool" | "none";

/** Hero CTA: recruiting wins when present, otherwise pool-only if any form exists. */
export function applyCtaMode(
  openCount: number,
  totalCount: number,
): ApplyCtaMode {
  if (openCount > 0) return "apply";
  return totalCount > 0 ? "pool" : "none";
}
