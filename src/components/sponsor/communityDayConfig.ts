// ponytail: display copy and selection helpers are static here;
// package definitions/prices/unlock state and sponsor tiers come from the
// backend at runtime via fetchSponsorPackages — see
// plan/comday_sponsor_admin_configuration.

import type { SponsorPackageGroup, SponsorTier } from "@/lib/types";

export const COMMUNITY_DAY_EVENT_SLUG = "community-day-2026";

export const communityDayEvent = {
  name: "AWS Community Day Jakarta 2026",
  location: "Jakarta, Indonesia",
  date: "TBD",
} as const;

export const sponsorContactEmail = "awsugjakarta@gmail.com";

/**
 * Highest admin-configured tier whose thresholdIdr is met by the total;
 * null when nothing is reached (replaces the old "none" sentinel).
 * Response claims descending order but sorting defensively anyway.
 */
export function resolveSponsorTier(
  total: number,
  tiers: SponsorTier[],
): SponsorTier | null {
  if (total <= 0) return null;
  return (
    [...tiers]
      .sort((a, b) => b.thresholdIdr - a.thresholdIdr)
      .find((t) => t.thresholdIdr <= total) ?? null
  );
}

export function formatIDR(amount: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export const STORAGE_KEY = "awsugj-community-day-sponsor-selection-v1";

/**
 * Restore raw selection from storage without discarding IDs: temporarily locked
 * packages must survive so they re-count if unlocked later, and sanitizeSelection
 * trims unknown IDs only once fetched package IDs are known.
 */
export function parseStoredSelection(saved: string | null): Record<string, boolean> {
  let parsed: unknown;
  try {
    parsed = saved ? JSON.parse(saved) : null;
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (value === true) result[key] = true;
  }
  return result;
}

export function sanitizeSelection(
  saved: unknown,
  validIds: string[],
): Record<string, boolean> {
  if (typeof saved !== "object" || saved === null) return {};
  const validSet = new Set(validIds);
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
    if (validSet.has(key) && value === true) result[key] = true;
  }
  return result;
}

/**
 * Minimal package shape for spend-threshold and capacity logic; structurally
 * compatible with SponsorPackage before and after it gains minimumSpendIdr,
 * maxSponsors, and reservedSponsors in parallel.
 */
export interface SpendAwarePackage {
  id: string;
  priceIdr: number;
  isUnlocked: boolean;
  minimumSpendIdr?: number | null;
  maxSponsors?: number | null;
  reservedSponsors?: number;
}

export function minimumSpendOf(p: SpendAwarePackage): number | null {
  return p.minimumSpendIdr ?? null;
}

export function maxSponsorsOf(p: SpendAwarePackage): number | null {
  return p.maxSponsors ?? null;
}

export function reservedSponsorsOf(p: SpendAwarePackage): number {
  return p.reservedSponsors ?? 0;
}

/** Sold out iff capacity is limited and reservations reached the cap. */
export function isSoldOut(p: SpendAwarePackage): boolean {
  const max = maxSponsorsOf(p);
  return max !== null && reservedSponsorsOf(p) >= max;
}

/** Remaining selectable slots; null when capacity is unlimited. */
export function remainingSponsorSlots(p: SpendAwarePackage): number | null {
  const max = maxSponsorsOf(p);
  return max === null ? null : Math.max(0, max - reservedSponsorsOf(p));
}

/**
 * Minimal package shape for backend-driven grouping; groupId may be absent
 * from SponsorPackage until the shared type gains it, hence optional.
 */
export interface GroupAwarePackage {
  id: string;
  displayOrder: number;
  groupId?: string | null;
}

export interface SponsorSection<P extends GroupAwarePackage = GroupAwarePackage> {
  id: string;
  label: string;
  packages: P[];
}

/**
 * Sections from backend groups ordered by displayOrder; within each group
 * packages are filtered by groupId and keep package displayOrder. Packages
 * referencing an unknown (or missing) group fall into a final defensive
 * "Other" section instead of disappearing. Empty groups are omitted.
 */
export function buildSponsorSections<P extends GroupAwarePackage>(
  packages: P[],
  groups: SponsorPackageGroup[] | null | undefined,
): SponsorSection<P>[] {
  const byDisplayOrder = (
    a: { displayOrder: number },
    b: { displayOrder: number },
  ) => a.displayOrder - b.displayOrder;
  const known = new Set((groups ?? []).map((g) => g.id));
  const sections = [...(groups ?? [])]
    .sort(byDisplayOrder)
    .map((g) => ({
      id: g.id,
      label: g.label,
      packages: packages.filter((p) => p.groupId === g.id).sort(byDisplayOrder),
    }))
    .filter((s) => s.packages.length > 0);
  const other = packages
    .filter((p) => p.groupId == null || !known.has(p.groupId))
    .sort(byDisplayOrder);
  if (other.length > 0) {
    sections.push({ id: "__other__", label: "Other", packages: other });
  }
  return sections;
}

/**
 * Fixed-point resolution of the raw selection: start from selected packages
 * with no minimum requirement, then repeatedly include selected+unlocked
 * packages whose minimumSpendIdr is met by the current effective subtotal.
 * A package can never satisfy its own minimum, and chained thresholds resolve
 * in dependency order. Sold-out packages are excluded so totals/tier/email
 * reflect effective availability only; raw selection is never mutated, so a
 * selection returns automatically if capacity reopens.
 */
export function resolveEffectiveSelection(
  packages: SpendAwarePackage[],
  rawSelection: Record<string, boolean>,
): Record<string, boolean> {
  const pending = packages.filter(
    (p) => p.isUnlocked && !isSoldOut(p) && rawSelection[p.id] === true,
  );
  const effective: Record<string, boolean> = {};
  let total = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of pending) {
      if (effective[p.id]) continue;
      const minimum = minimumSpendOf(p);
      if (minimum === null || total >= minimum) {
        effective[p.id] = true;
        total += p.priceIdr;
        changed = true;
      }
    }
  }
  return effective;
}
