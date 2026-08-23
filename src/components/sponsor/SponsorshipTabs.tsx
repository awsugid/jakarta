import { useState, useEffect } from "react";
import { Presentation, Calculator, Handshake, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { communityDayEvent } from "@/components/sponsor/communityDayConfig";
import { SponsorConfigurator } from "@/components/sponsor/SponsorConfigurator";
import { SponsorTiers } from "@/components/sponsor/SponsorTiers";
import { SponsorBenefits } from "@/components/sponsor/SponsorBenefits";

type TabId = "community" | "monthly";

const TABS: { id: TabId; label: string; icon: typeof Presentation }[] = [
  { id: "community", label: "Community Day 2026", icon: Presentation },
  { id: "monthly", label: "Monthly Meetup", icon: Handshake },
];

interface SponsorshipTabsProps {
  deckUrl?: string;
}

export function SponsorshipTabs({ deckUrl }: SponsorshipTabsProps) {
  const [tab, setTab] = useState<TabId>("community");

  useEffect(() => {
    const scrollToTarget = (targetId: string) => {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          const navOffset = 90;
          const elementPosition = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: Math.max(0, elementPosition - navOffset),
            behavior: "smooth",
          });
        }
      }, 120);
    };

    const syncFromHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.toLowerCase();
      if (hash === "#monthly") {
        setTab("monthly");
        scrollToTarget("monthly");
      } else if (hash === "#comday" || hash === "#community") {
        setTab("community");
        scrollToTarget("comday");
      } else if (hash === "#contact") {
        scrollToTarget("contact");
      }
    };

    const handleCustomTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<TabId>;
      if (customEvent.detail === "community" || customEvent.detail === "monthly") {
        const targetId = customEvent.detail === "community" ? "comday" : "monthly";
        setTab(customEvent.detail);
        scrollToTarget(targetId);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("sponsor-tab-change", handleCustomTabChange);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("sponsor-tab-change", handleCustomTabChange);
    };
  }, []);

  const handleTabClick = (id: TabId) => {
    setTab(id);
    const targetId = id === "community" ? "comday" : "monthly";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${targetId}`);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          const navOffset = 90;
          const elementPosition = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: Math.max(0, elementPosition - navOffset),
            behavior: "smooth",
          });
        }
      }, 100);
    }
  };

  return (
    <div>
      <div className="container mx-auto px-4 md:px-6 pt-16 sm:pt-20">
        <div
          role="tablist"
          aria-label="Sponsorship track"
          className="mx-auto flex max-w-md w-full flex-col sm:flex-row gap-2 rounded-2xl sm:rounded-full border border-border bg-card/60 p-1.5 backdrop-blur-sm"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-controls={`sponsor-panel-${id}`}
                id={`sponsor-tab-${id}`}
                onClick={() => handleTabClick(id)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow animate-in fade-in duration-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "community" ? (
        <div
          role="tabpanel"
          id="comday"
          aria-labelledby="sponsor-tab-community"
          className="scroll-mt-24 sm:scroll-mt-28"
        >
          <section className="py-16 sm:py-20 relative overflow-hidden bg-background">
            {/* Background glowing effects to match Home page */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-primary/10 rounded-full blur-[100px] -z-10 opacity-30 animate-pulse duration-[6000ms]" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] -z-10 opacity-20" />
            <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[90px] -z-10 opacity-20" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 pointer-events-none"></div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
              <header className="max-w-3xl mx-auto text-center space-y-4 mb-10">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {communityDayEvent.name} · {communityDayEvent.location}
                </p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  Sponsor Community Day 2026
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Browse the deck, then build your own package below. Every partner earns a badge.
                </p>
              </header>

              {deckUrl ? (
                <>
                  {/* Mobile: premium-styled card, easier to read & tap */}
                  <a
                    href={deckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:hidden flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-card p-4 shadow-md active:scale-[0.98] transition-all hover:border-primary/40 cursor-pointer"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Presentation className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0 text-left">
                      <span className="block text-sm font-semibold text-foreground">View Sponsorship Deck</span>
                      <span className="block text-xs text-muted-foreground">Opens in a new tab</span>
                    </span>
                    <ExternalLink className="h-4 w-4 text-primary" aria-hidden="true" />
                  </a>

                  {/* sm+: embedded iframe. */}
                  <div className="hidden sm:block mx-auto max-w-5xl rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                        <Presentation className="h-4 w-4 text-primary" aria-hidden="true" />
                        Sponsorship Deck
                      </div>
                      <a
                        href={deckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-4"
                      >
                        Open in new tab
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                    <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                      <iframe
                        src={deckUrl}
                        title="AWS Community Day Jakarta 2026 — Sponsorship Deck"
                        className="absolute inset-0 h-full w-full"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <Presentation
                    className="mx-auto h-8 w-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-foreground font-medium">Sponsorship deck coming soon</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The 2026 deck will be published here. Reach out for an early preview.
                  </p>
                </div>
              )}
            </div>
          </section>

          <SponsorConfigurator />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="monthly"
          aria-labelledby="sponsor-tab-monthly"
          className="scroll-mt-24 sm:scroll-mt-28"
        >
          <section className="py-16 sm:py-20 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
              <header className="max-w-3xl mx-auto text-center space-y-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  Open to Collaboration
                </p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  Monthly Meetup Partnership
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Our monthly meetups are open to sponsorship and collaboration partners.
                  Pick a model below or reach out to discuss a custom arrangement that fits your goals.
                </p>
              </header>
            </div>
          </section>

          <SponsorTiers />
          <SponsorBenefits />
        </div>
      )}
    </div>
  );
}
