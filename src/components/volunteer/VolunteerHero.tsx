import React from "react";
import { HandHeart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";

interface VolunteerHeroProps {
  kioskUrl?: string;
  openCount?: number;
  onApplyClick?: () => void;
}

export function VolunteerHero({ kioskUrl, openCount, onApplyClick }: VolunteerHeroProps) {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32 bg-background">
      <div className="container mx-auto relative z-10 flex flex-col items-center text-center px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
          <Badge
            variant="outline"
            className="mb-6 py-1.5 px-4 text-sm backdrop-blur-sm bg-background/50 border-muted-foreground/20"
          >
            <span
              className={`flex h-2 w-2 rounded-full mr-2 animate-pulse ${openCount && openCount > 0 ? "bg-green-500" : "bg-primary"}`}
            ></span>
            {openCount && openCount > 0
              ? `${openCount} Division(s) Open — Apply Now!`
              : "Subscribe for Volunteer Announcements"}
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
          Volunteer with <span className="text-primary">AWS UG Jakarta</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          Give back to the community, build new skills, and connect with fellow
          AWS enthusiasts. Volunteering is one of the best ways to grow your
          career while helping others learn.
        </p>

        {openCount && openCount > 0 ? (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onApplyClick}
              className="h-12 px-8 text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              <HandHeart className="mr-2 h-5 w-5" />
              Apply to Volunteer
            </Button>
            <a href="#volunteer-roles">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-medium rounded-md border-border/80 hover:bg-muted cursor-pointer"
              >
                Browse Divisions
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both">
            <HandHeart className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Join our volunteer subscription list to be notified the moment
              applications open
            </span>
          </div>
        )}
      </div>

      {kioskUrl ? (
        <ImmichKioskBackground kioskUrl={kioskUrl} />
      ) : (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-primary/10 rounded-full blur-[100px] -z-10 opacity-40 animate-pulse duration-[5000ms]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -z-10 opacity-30" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[90px] -z-10 opacity-30" />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 pointer-events-none"></div>
        </>
      )}
    </section>
  );
}
