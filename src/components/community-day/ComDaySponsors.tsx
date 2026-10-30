import React, { useEffect, useState } from "react";
import { SponsorGrid, type Sponsor, type SponsorTierType } from "@/components/sponsors/SponsorGrid";
import { COMDAY26_SPONSORS } from "@/data/sponsors";
import { fetchPublicSponsors } from "@/lib/api";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import { Handshake, ArrowRight, Target, Briefcase, Sparkles, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComDaySponsorsProps {
  initialSponsors?: Sponsor[];
  title?: string;
  subtitle?: string;
  sectionId?: string;
  showConfiguratorCta?: boolean;
}

const VALUE_PILLARS = [
  {
    icon: Target,
    title: "Direct Brand Visibility",
    description: "Showcase your brand, developer tools, or cloud solutions to an engaged audience of active practitioners and tech decision-makers.",
  },
  {
    icon: Briefcase,
    title: "Talent & Engineering Hiring",
    description: "Connect with high-caliber cloud engineers, solutions architects, DevOps leads, and AI practitioners looking for their next opportunity.",
  },
  {
    icon: Sparkles,
    title: "Thought Leadership",
    description: "Lead technical breakout sessions, share real-world architectures, and position your company at the forefront of cloud innovation.",
  },
  {
    icon: Award,
    title: "Community Impact",
    description: "Support local tech talent development and demonstrate ongoing commitment to open learning in the Indonesian developer ecosystem.",
  },
];

export function ComDaySponsors({
  initialSponsors,
  title = "Our Sponsors & Partners",
  subtitle = "Supported by organizations driving cloud innovation in Indonesia.",
  sectionId = "sponsors",
  showConfiguratorCta = false,
}: ComDaySponsorsProps = {}) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(() => {
    if (initialSponsors && initialSponsors.length > 0) return initialSponsors;
    return COMDAY26_SPONSORS;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSponsors() {
      try {
        const res = await fetchPublicSponsors(COMMUNITY_DAY_EVENT_SLUG);
        if (!cancelled && res.sponsors && res.sponsors.length > 0) {
          const mapped: Sponsor[] = res.sponsors.map((s) => ({
            name: s.name,
            logo: s.logoUrl,
            url: s.websiteUrl || undefined,
            tier: s.tier.toLowerCase() as SponsorTierType,
          }));
          setSponsors(mapped);
        }
      } catch (err) {
        // Retain fallback / initial sponsors if fetch fails
      }
    }

    loadSponsors();

    return () => {
      cancelled = true;
    };
  }, []);

  const displaySponsors = sponsors.length > 0 ? sponsors : COMDAY26_SPONSORS;

  return (
    <div id={sectionId} className="scroll-mt-20">
      <SponsorGrid
        id={`${sectionId}-gallery`}
        sponsors={displaySponsors}
        title={title}
        subtitle={subtitle}
        showBecomeSponsorCta={false}
      />

      {/* Optional Sponsor Configurator & Opportunity CTA */}
      {showConfiguratorCta && (
        <section className="pb-24 pt-4 px-4 bg-background border-b border-border relative overflow-hidden">
          <div className="container max-w-6xl mx-auto space-y-12">
            {/* ROI Value Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PILLARS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-5 flex flex-col justify-between space-y-3 transition-all duration-300 hover:border-orange-500/30 hover:shadow-lg group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Package Configurator Callout */}
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-orange-500/[0.05] via-card/85 to-amber-500/[0.04] border border-orange-500/25 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[64px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[64px] pointer-events-none" />

              <div className="space-y-2 relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-widest">
                  🤝 Partner With Us
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Interested in Sponsoring Community Day 2026?
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Explore our live interactive sponsorship configurator, calculate custom budgets, explore modular add-ons, or download the official prospectus.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full sm:w-auto justify-center">
                <Button
                  asChild
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold py-6 px-8 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-sm sm:text-base"
                >
                  <a href="/sponsor#comday" className="inline-flex items-center gap-2">
                    <Handshake className="h-5 w-5" />
                    <span>Open Live Sponsor Configurator</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

(ComDaySponsors as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] = "@astrojs/react";
