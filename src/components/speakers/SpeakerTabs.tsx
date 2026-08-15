"use client";

import { useState } from "react";
import { Presentation, Mic, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunityDayCfp } from "@/components/sessionize/CommunityDayCfp";
import { SpeakerBenefits } from "@/components/speakers/SpeakerBenefits";
import { SpeakerNotify } from "@/components/speakers/CFPForm";
import type { FormInfo } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type TabId = "community" | "monthly";

const TABS: { id: TabId; label: string; icon: typeof Presentation }[] = [
  { id: "community", label: "Community Day 2026", icon: Presentation },
  { id: "monthly", label: "Monthly Meetup", icon: Mic },
];

interface SpeakerTabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  forms: FormInfo[];
  loading: boolean;
  error: boolean;
  onApply: (slug: string, title: string) => void;
}

export function SpeakerTabs({
  activeTab,
  onTabChange,
  forms,
  loading,
  error,
  onApply,
}: SpeakerTabsProps) {
  const [internalTab, setInternalTab] = useState<TabId>("community");
  const tab = activeTab ?? internalTab;

  const handleSelectTab = (selected: TabId) => {
    if (onTabChange) {
      onTabChange(selected);
    } else {
      setInternalTab(selected);
    }
  };

  return (
    <div className="w-full">
      {/* Tab Switcher Header */}
      <div className="container mx-auto px-4 md:px-6 pt-12 sm:pt-16">
        <div
          role="tablist"
          aria-label="Speaker tracks"
          className="mx-auto flex max-w-md w-full flex-col sm:flex-row gap-2 rounded-2xl sm:rounded-full border border-border bg-card/60 p-1.5 backdrop-blur-sm"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-controls={`speaker-panel-${id}`}
                id={`speaker-tab-${id}`}
                onClick={() => handleSelectTab(id)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-4 py-2.5 text-sm font-medium transition-all cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-md animate-in fade-in duration-300"
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

      {/* Tab Panel Content */}
      <div className="pt-8">
        {tab === "community" ? (
          <div
            role="tabpanel"
            id="speaker-panel-community"
            aria-labelledby="speaker-tab-community"
            className="animate-in fade-in-50 duration-300"
          >
            <section className="py-12 sm:py-16 relative overflow-hidden bg-background">
              {/* Background glowing ambient effects */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

              <div className="container max-w-5xl mx-auto px-4 md:px-6 space-y-8">
                <header className="max-w-3xl mx-auto text-center space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                    🎤 Community Day 2026 Sessionize CFP
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    AWS Community Day Jakarta 2026
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                    Submit your talk proposal directly via Sessionize for our annual developer conference at BINUS Anggrek, Jakarta Barat.
                  </p>
                </header>

                <div className="bg-card/40 border border-border/80 rounded-3xl p-4 sm:p-8 backdrop-blur-sm shadow-xl">
                  <CommunityDayCfp />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="speaker-panel-monthly"
            aria-labelledby="speaker-tab-monthly"
            className="animate-in fade-in-50 duration-300"
          >
            <section className="py-12 sm:py-16 relative overflow-hidden bg-muted/20">
              <div className="container max-w-5xl mx-auto px-4 md:px-6 mb-8">
                <header className="max-w-3xl mx-auto text-center space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Monthly Meetups Formbrick CFP
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    Monthly Meetup Speaker Proposals
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                    We host monthly community meetups across Jakarta. Apply below using our community form for upcoming meetup slots.
                  </p>
                </header>
              </div>

              {!loading && !error && (
                <SpeakerBenefits forms={forms} onApply={onApply} />
              )}

              {!loading && (error || forms.length === 0) && (
                <SpeakerBenefits />
              )}

              {loading && (
                <div className="container max-w-5xl mx-auto px-4 md:px-6 py-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-card border border-border/80 rounded-2xl p-6 space-y-4 shadow-sm"
                    >
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full rounded-xl pt-2" />
                    </div>
                  ))}
                </div>
              )}

              <SpeakerNotify />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
