import React, { useEffect, useState } from "react";
import { SponsorGrid, type Sponsor, type SponsorTierType } from "@/components/sponsors/SponsorGrid";
import { COMDAY26_SPONSORS } from "@/data/sponsors";
import { fetchPublicSponsors } from "@/lib/api";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

export function ComDaySponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>(COMDAY26_SPONSORS);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSponsors(COMMUNITY_DAY_EVENT_SLUG)
      .then((res) => {
        if (!cancelled && res.sponsors && res.sponsors.length > 0) {
          const mapped: Sponsor[] = res.sponsors.map((s) => ({
            name: s.name,
            logo: s.logoUrl,
            url: s.websiteUrl || undefined,
            tier: s.tier.toLowerCase() as SponsorTierType,
          }));
          setSponsors(mapped);
        }
      })
      .catch(() => {
        // Fall back gracefully to static COMDAY26_SPONSORS
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SponsorGrid
      sponsors={sponsors}
      title="Our Sponsors & Partners"
      subtitle="Supported by organizations driving cloud innovation in Indonesia."
      showBecomeSponsorCta={true}
    />
  );
}
