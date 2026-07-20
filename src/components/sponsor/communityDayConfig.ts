// ponytail: inline config; migrate to astro:content collection when a second event adopts this model.

export type SponsorAssetCategory = "digital" | "onsite";

export interface SponsorAsset {
  id: string;
  name: string;
  price: number;
  advantage: string;
  category: SponsorAssetCategory;
}

export const communityDayEvent = {
  name: "AWS Community Day Jakarta 2026",
  date: "TBD",
  location: "Jakarta, Indonesia",
} as const;

export const sponsorContactEmail = "awsugjakarta@gmail.com";

export const sponsorAssets: SponsorAsset[] = [
  {
    id: "web-logo",
    name: "Website Logo",
    price: 2_500_000,
    advantage: "High-intent brand exposure on jakarta.awscommunity.id",
    category: "digital",
  },
  {
    id: "social-blast",
    name: "Social Blast",
    price: 2_500_000,
    advantage: "Direct amplification of products or hiring to digital community",
    category: "digital",
  },
  {
    id: "video-ad",
    name: "Video Ad",
    price: 5_000_000,
    advantage: "30–60 second narrative slot or platform demo during breaks",
    category: "digital",
  },
  {
    id: "email-footer",
    name: "Email Footer",
    price: 8_000_000,
    advantage: "Brand placement on ticket confirmations, logistics, and post-event email",
    category: "digital",
  },
  {
    id: "tshirt",
    name: "T-Shirt",
    price: 6_000_000,
    advantage: "Long-tail visual marketing through event merchandise",
    category: "onsite",
  },
  {
    id: "lanyard",
    name: "Lanyard",
    price: 7_500_000,
    advantage: "Eye-level presence worn by participants",
    category: "onsite",
  },
  {
    id: "backdrop",
    name: "Backdrop",
    price: 4_000_000,
    advantage: "Branding in official and participant event photos",
    category: "onsite",
  },
  {
    id: "mc-mention",
    name: "MC Mention",
    price: 3_500_000,
    advantage: "Verbal sponsor callouts during breaks",
    category: "onsite",
  },
];

export type SponsorTierId = "platinum" | "gold" | "silver" | "supporter" | "none";

export interface SponsorTier {
  id: SponsorTierId;
  label: string;
}

export const sponsorTiers: SponsorTier[] = [
  { id: "platinum", label: "Platinum" },
  { id: "gold", label: "Gold" },
  { id: "silver", label: "Silver" },
  { id: "supporter", label: "Community Supporter" },
];

export function computeSponsorTier(total: number): SponsorTier {
  if (total >= 40_000_000) return { id: "platinum", label: "Platinum" };
  if (total >= 25_000_000) return { id: "gold", label: "Gold" };
  if (total >= 10_000_000) return { id: "silver", label: "Silver" };
  if (total > 0) return { id: "supporter", label: "Community Supporter" };
  return { id: "none", label: "No tier" };
}

export function formatIDR(amount: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export const STORAGE_KEY = "awsugj-community-day-sponsor-selection-v1";

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
