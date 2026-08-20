import React from "react";
import { Handshake, Users, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";

const metrics = [
  { icon: Users, label: "Community Members", value: "4,000+" },
  { icon: Calendar, label: "Events Hosted", value: "50+" },
  { icon: TrendingUp, label: "Growth Rate", value: "Monthly" },
];

interface SponsorHeroProps {
  kioskUrl?: string;
}

export function SponsorHero({ kioskUrl }: SponsorHeroProps) {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center pt-24 sm:pt-28 pb-16 px-4 bg-background">
      <div className="container mx-auto relative z-10 flex flex-col items-center text-center px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
          <Badge
            variant="outline"
            className="mb-6 py-1.5 px-4 text-sm backdrop-blur-sm bg-background/50 border-muted-foreground/20"
          >
            <Handshake className="mr-2 h-3.5 w-3.5 text-primary" />
            Open for Collaboration
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
          Sponsor & <span className="text-primary">Collaborate</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          AWS User Group Jakarta is always open for collaboration. Whether
          you're a company looking to reach cloud professionals or an individual
          wanting to contribute, there are many ways to partner with us.
        </p>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl bg-card/50 border border-border/50"
            >
              <metric.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="text-base sm:text-lg font-bold text-foreground">
                {metric.value}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground text-center line-clamp-1 sm:line-clamp-none">
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Immich Photo Carousel Background */}
      <ImmichKioskBackground
        kioskUrl={kioskUrl}
        randomizeAlbumOnVisit={true}
      />
    </section>
  );
}
