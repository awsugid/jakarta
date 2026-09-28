import type { SponsorTierAccent } from "@/lib/types";

export interface PackageDraft {
  name: string;
  advantage: string;
  groupId: string;
  price: string;
  /** Empty string = derive USD from the exchange rate (null). */
  priceUsd: string;
  /** Empty string = no spend requirement. */
  minSpend: string;
  /** Empty string = unlimited (null). */
  maxSponsors: string;
  reservedSponsors: string;
  isUnlocked: boolean;
  /** Custom placement image URL override. */
  imageUrl: string;
}

export interface GroupDraft {
  label: string;
  displayOrder: number;
}

export interface TierDraft {
  label: string;
  threshold: string;
  /** Empty string = derive USD threshold from the exchange rate (null). */
  thresholdUsd: string;
  accent: SponsorTierAccent;
}

export interface NewPackageInput {
  name: string;
  advantage: string;
  price: string;
  priceUsd: string;
  imageUrl?: string;
}

export interface NewTierInput {
  label: string;
  threshold: string;
  thresholdUsd: string;
  accent: SponsorTierAccent;
}

export type DeleteTarget =
  | { kind: "package"; id: string; name: string }
  | { kind: "group"; id: string; name: string }
  | { kind: "tier"; id: string; name: string };

export const PLACEMENT_PRESETS: { id: string; label: string; url: string }[] = [
  { id: "xbanner", label: "X-Banner", url: "https://avatars.awscommunity.id/comday-26/xbanner.png" },
  { id: "backdrop", label: "Backdrop", url: "https://avatars.awscommunity.id/comday-26/backdrop.png" },
  { id: "lanyard", label: "Lanyard", url: "https://avatars.awscommunity.id/comday-26/lanyard.png" },
  { id: "booth", label: "Booth", url: "https://avatars.awscommunity.id/comday-26/booth.png" },
  { id: "video-ad", label: "Video Ad", url: "https://avatars.awscommunity.id/comday-26/video-ad.png" },
  { id: "website", label: "Website", url: "https://avatars.awscommunity.id/comday-26/website.png" },
  { id: "t-shirt", label: "T-Shirt", url: "https://avatars.awscommunity.id/comday-26/t-shirt.png" },
  { id: "social-media", label: "Social Media", url: "https://avatars.awscommunity.id/comday-26/social-media.png" },
];
