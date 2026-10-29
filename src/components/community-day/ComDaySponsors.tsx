import React, { useEffect, useState } from "react";
import { SponsorGrid, type Sponsor, type SponsorTierType } from "@/components/sponsors/SponsorGrid";
import { COMDAY26_SPONSORS } from "@/data/sponsors";
import { fetchPublicSponsors } from "@/lib/api";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

export function ComDaySponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>(COMDAY26_SPONSORS);

  useEffect(() => {
    let cancelled = false;

    async function loadSponsors() {
      try {
        const res = await fetchPublicSponsors(COMMUNITY_DAY_EVENT_SLUG);
        if (!cancelled) {
          if (res.sponsors && res.sponsors.length > 0) {
            const mapped: Sponsor[] = res.sponsors.map((s) => ({
              name: s.name,
              logo: s.logoUrl,
              url: s.websiteUrl || undefined,
              tier: s.tier.toLowerCase() as SponsorTierType,
            }));
            // If backend sponsors do not include BINUS, keep BINUS fallback alongside
            const hasBinus = mapped.some((s) => s.name.toLowerCase().includes("binus"));
            setSponsors(hasBinus ? mapped : [...mapped, ...COMDAY26_SPONSORS]);
          } else {
            // Empty response fallback
            setSponsors(COMDAY26_SPONSORS);
          }
        }
      } catch (err) {
        if (!cancelled) {
          // Network / endpoint error fallback
          setSponsors(COMDAY26_SPONSORS);
        }
      }
    }

    loadSponsors();

    return () => {
      cancelled = true;
    };
  }, []);

  const displaySponsors = sponsors.length > 0 ? sponsors : COMDAY26_SPONSORS;

  return (
    <SponsorGrid
      sponsors={displaySponsors}
      title="Our Sponsors & Partners"
      subtitle="Supported by organizations driving cloud innovation in Indonesia."
      showBecomeSponsorCta={false}
    />
  );
}

(ComDaySponsors as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";
