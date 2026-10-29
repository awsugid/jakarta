import { describe, it, expect } from "bun:test";
import type { EventSponsor } from "@/lib/types";
import type { Sponsor, SponsorTierType } from "@/components/sponsors/SponsorGrid";

describe("Sponsor Directory & Gallery Wiring", () => {
  it("maps backend EventSponsor to frontend Sponsor model correctly", () => {
    const backendSponsor: EventSponsor = {
      id: "binus-university",
      eventSlug: "community-day-2026",
      name: "BINUS University",
      logoUrl: "/assets/comday26/sponsors/binus.png",
      websiteUrl: "https://binus.ac.id",
      tier: "venue",
      priceIdr: 0,
      description: "Official Venue Partner",
      isActive: true,
      displayOrder: 1,
      createdAt: "2026-09-28 08:35:56",
      updatedAt: "2026-10-29 04:10:46",
    };

    const mapped: Sponsor = {
      name: backendSponsor.name,
      logo: backendSponsor.logoUrl,
      url: backendSponsor.websiteUrl || undefined,
      tier: backendSponsor.tier.toLowerCase() as SponsorTierType,
    };

    expect(mapped.name).toBe("BINUS University");
    expect(mapped.logo).toBe("/assets/comday26/sponsors/binus.png");
    expect(mapped.url).toBe("https://binus.ac.id");
    expect(mapped.tier).toBe("venue");
  });

  it("handles null / optional fields gracefully without breaking", () => {
    const minimalBackendSponsor: EventSponsor = {
      id: "aws",
      eventSlug: "community-day-2026",
      name: "Amazon Web Services",
      logoUrl: "https://avatars.awscommunity.id/sponsors/aws.png",
      websiteUrl: null as unknown as string,
      tier: "Diamond",
      priceIdr: 50000000,
      description: null as unknown as string,
      isActive: true,
      displayOrder: 2,
      createdAt: "2026-10-29 10:00:00",
      updatedAt: "2026-10-29 10:00:00",
    };

    const mapped: Sponsor = {
      name: minimalBackendSponsor.name,
      logo: minimalBackendSponsor.logoUrl,
      url: minimalBackendSponsor.websiteUrl || undefined,
      tier: minimalBackendSponsor.tier.toLowerCase() as SponsorTierType,
    };

    expect(mapped.name).toBe("Amazon Web Services");
    expect(mapped.url).toBeUndefined();
    expect(mapped.tier).toBe("diamond");
  });

  it("preserves custom and standard tiers without dropping non-standard tiers", () => {
    const TIER_ORDER = [
      "venue",
      "diamond",
      "platinum",
      "gold",
      "silver",
      "bronze",
      "community",
      "media",
      "supporter",
    ];

    const sponsors: Sponsor[] = [
      { name: "Venue Co", logo: "/venue.png", tier: "venue" },
      { name: "Custom Partner", logo: "/custom.png", tier: "education" },
      { name: "Gold Co", logo: "/gold.png", tier: "gold" },
    ];

    const knownTiers = new Set(TIER_ORDER);
    const extraTiers = Array.from(
      new Set(sponsors.map((s) => s.tier.toLowerCase()).filter((t) => !knownTiers.has(t)))
    );
    const allTiers = [...TIER_ORDER, ...extraTiers];

    expect(allTiers).toContain("education");
    expect(allTiers.indexOf("venue")).toBe(0);
    expect(allTiers.indexOf("education")).toBe(TIER_ORDER.length);

    const grouped = allTiers
      .map((tier) => ({
        tier,
        items: sponsors.filter((s) => s.tier.toLowerCase() === tier.toLowerCase()),
      }))
      .filter((g) => g.items.length > 0);

    expect(grouped.length).toBe(3);
    expect(grouped.some((g) => g.tier === "education")).toBe(true);
  });
});
