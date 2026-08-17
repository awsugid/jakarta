import React from "react";
import { Mic, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";
import { RotatingEventName } from "@/components/RotatingEventName";
import { SESSIONIZE_CONFIG } from "@/lib/sessionize";

interface SpeakerHeroProps {
  kioskUrl?: string;
  isOpen?: boolean;
  activeTab?: "community" | "monthly";
  onApply?: () => void;
}

export function SpeakerHero({
  kioskUrl,
  isOpen = true,
  activeTab = "community",
  onApply,
}: SpeakerHeroProps) {
  return (
    <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center pt-24 sm:pt-28 pb-16 px-4 bg-background">

      <div className="container mx-auto relative z-10 flex flex-col items-center text-center px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
          <Badge
            variant="outline"
            className="mb-6 py-1.5 px-4 text-sm backdrop-blur-sm bg-background/50 border-muted-foreground/20"
          >
            <span className="flex h-2 w-2 rounded-full mr-2 animate-pulse bg-green-500"></span>
            {activeTab === "community"
              ? "Share Your Story at Community Day Jakarta — Sessionize"
              : "Monthly Meetup CFP Open — Formbrick Application"}
          </Badge>
        </div>

        <h1 className="min-h-20 sm:min-h-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
          <span className="sr-only">Speak at AWS User Group Jakarta</span>
          <span aria-hidden="true">
            Speak at <span className="text-primary">AWS </span>
            <RotatingEventName
              names={["User Group Jakarta", "Monthly Meetups", "Community Day"]}
            />
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          {activeTab === "community"
            ? "Share your practical AWS experience at Community Day Jakarta 2026. Submit your proposal directly via Sessionize."
            : "Share practical AWS knowledge at our monthly Jakarta meetups. Submit a proposal using our community form."}
        </p>

        <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both flex flex-col sm:flex-row gap-4 justify-center">
          {activeTab === "community" ? (
            <Button
              asChild
              size="lg"
              className="h-12 w-full sm:w-64 px-8 text-base font-bold rounded-md bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 gap-2"
            >
              <a href={SESSIONIZE_CONFIG.CFP_URL} target="_blank" rel="noopener noreferrer">
                <Mic className="h-5 w-5" />
                Share Your Story
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onApply}
              className="h-12 w-full sm:w-64 px-8 text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-orange-500/20 gap-2"
            >
              <Mic className="h-5 w-5" />
              Apply for Meetup
            </Button>
          )}

          <a href="/blog/speaker">
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full sm:w-56 px-8 text-base font-medium rounded-md border-border/80 hover:bg-muted"
            >
              Learn More
            </Button>
          </a>
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

