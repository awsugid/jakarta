import React from "react";
import { ExternalLink, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SponsorTierType =
  | "venue"
  | "diamond"
  | "gold"
  | "silver"
  | "community"
  | "media";

export interface Sponsor {
  name: string;
  logo: string;
  url?: string;
  tier: SponsorTierType;
}

export interface SponsorGridProps {
  sponsors?: Sponsor[];
  title?: string;
  subtitle?: string;
  showBecomeSponsorCta?: boolean;
}

const DEFAULT_SPONSORS: Sponsor[] = [
  {
    name: "BINUS University",
    logo: "/assets/comday26/sponsors/binus.png",
    url: "https://binus.ac.id",
    tier: "venue",
  },
];

const TIER_META: Record<
  SponsorTierType,
  {
    title: string;
    gridClass: string;
    cardClass: string;
    logoHeight: string;
    containerHeight: string;
  }
> = {
  venue: {
    title: "Venue Partner",
    gridClass: "grid grid-cols-1 max-w-sm mx-auto",
    cardClass: "p-6",
    logoHeight: "max-h-16",
    containerHeight: "h-24",
  },
  diamond: {
    title: "Diamond Sponsors",
    gridClass: "grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto",
    cardClass: "p-6",
    logoHeight: "max-h-14",
    containerHeight: "h-20",
  },
  gold: {
    title: "Gold Sponsors",
    gridClass: "grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-4xl mx-auto",
    cardClass: "p-5",
    logoHeight: "max-h-12",
    containerHeight: "h-18",
  },
  silver: {
    title: "Silver Sponsors",
    gridClass: "grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto",
    cardClass: "p-4",
    logoHeight: "max-h-10",
    containerHeight: "h-16",
  },
  community: {
    title: "Community Partners",
    gridClass: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl mx-auto",
    cardClass: "p-3",
    logoHeight: "max-h-8",
    containerHeight: "h-14",
  },
  media: {
    title: "Media Partners",
    gridClass: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl mx-auto",
    cardClass: "p-3",
    logoHeight: "max-h-8",
    containerHeight: "h-14",
  },
};

const TIER_ORDER: SponsorTierType[] = [
  "venue",
  "diamond",
  "gold",
  "silver",
  "community",
  "media",
];

export function SponsorGrid({
  sponsors = DEFAULT_SPONSORS,
  title = "Our Sponsors & Partners",
  subtitle = "Supported by organizations empowering the developer community.",
  showBecomeSponsorCta = true,
}: SponsorGridProps) {
  const groupedSponsors = TIER_ORDER.map((tier) => ({
    tier,
    meta: TIER_META[tier],
    items: sponsors.filter((s) => s.tier === tier),
  })).filter((group) => group.items.length > 0);

  return (
    <section
      id="partners"
      className="scroll-mt-20 py-20 px-4 bg-background border-b border-border relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Partners & Sponsors</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mx-auto rounded-full" />
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* Sponsor Tier Showcase */}
        <div className="space-y-10">
          {groupedSponsors.map(({ tier, meta, items }) => (
            <div key={tier} className="space-y-4">
              {/* Clean Tier Title */}
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-400 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                  {meta.title}
                </span>
              </div>

              {/* Logos Grid */}
              <div className={meta.gridClass}>
                {items.map((sponsor, idx) => {
                  const isLink = Boolean(sponsor.url);
                  const CardElement = isLink ? "a" : "div";

                  return (
                    <CardElement
                      key={idx}
                      {...(isLink
                        ? {
                            href: sponsor.url,
                            target: "_blank",
                            rel: "noopener noreferrer",
                          }
                        : {})}
                      className={`group rounded-2xl border border-border/80 bg-card/60 hover:bg-card/90 hover:border-orange-500/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center ${meta.cardClass}`}
                    >
                      {/* Logo Container */}
                      <div
                        className={`w-full ${meta.containerHeight} bg-white rounded-xl p-3 flex items-center justify-center shadow-xs`}
                      >
                        <img
                          src={sponsor.logo}
                          alt={sponsor.name}
                          className={`w-auto max-w-full ${meta.logoHeight} object-contain transition-transform duration-200 group-hover:scale-105`}
                          loading="lazy"
                        />
                      </div>

                      {/* Sponsor Name & External Link */}
                      <div className="mt-3 flex items-center gap-1.5 text-center">
                        <span className="text-sm font-semibold text-foreground group-hover:text-orange-400 transition-colors">
                          {sponsor.name}
                        </span>
                        {isLink && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-orange-400 transition-colors" />
                        )}
                      </div>
                    </CardElement>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Action Link to Sponsor Page */}
        {showBecomeSponsorCta && (
          <div className="text-center pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-dashed border-border hover:border-orange-500/40 hover:bg-orange-500/5 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <a href="/sponsor">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-orange-400" />
                Become a Sponsor — View Packages
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
