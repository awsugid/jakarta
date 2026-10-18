import React, { useEffect, useState } from "react";
import { SponsorGrid, type Sponsor, type SponsorTierType } from "@/components/sponsors/SponsorGrid";
import { fetchPublicSponsors } from "@/lib/api";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";

export function ComDaySponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSponsors(COMMUNITY_DAY_EVENT_SLUG)
      .then((res) => {
        if (!cancelled) {
          const list = res.sponsors || [];
          const mapped: Sponsor[] = list.map((s) => ({
            name: s.name,
            logo: s.logoUrl,
            url: s.websiteUrl || undefined,
            tier: s.tier.toLowerCase() as SponsorTierType,
          }));
          setSponsors(mapped);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSponsors([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || sponsors.length === 0) {
    return null;
  }

  return (
    <SponsorGrid
      sponsors={sponsors}
      title="Our Sponsors & Partners"
      subtitle="Supported by organizations driving cloud innovation in Indonesia."
      showBecomeSponsorCta={true}
    />
  );
}

(ComDaySponsors as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";
