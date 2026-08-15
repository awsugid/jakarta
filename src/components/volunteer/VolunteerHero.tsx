import React from "react";
import { HandHeart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";
import { RotatingEventName } from "@/components/RotatingEventName";

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
              ? `${openCount} Community Day & Meetup Division(s) Open — Apply Now!`
              : "AWS Community Day & Meetup Volunteer Opportunities"}
          </Badge>
        </div>

        <h1 className="min-h-20 sm:min-h-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
          <span className="sr-only">Volunteer at AWS User Group Jakarta</span>
          <span aria-hidden="true">
            Volunteer at <span className="text-primary">AWS </span>
            <RotatingEventName
              names={["User Group Jakarta", "Monthly Meetups", "Community Day"]}
            />
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          Help deliver great AWS community events. Build event skills, meet
          fellow AWS enthusiasts, and make each event run smoothly.
        </p>

        <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both flex flex-col sm:flex-row gap-4 justify-center">
          {openCount && openCount > 0 && (
            <Button
              size="lg"
              onClick={onApplyClick}
              className="h-12 w-full sm:w-56 px-8 text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-orange-500/20 cursor-pointer"
            >
              <HandHeart className="mr-2 h-5 w-5" />
              Apply to Volunteer
            </Button>
          )}
          <a href="/blog/volunteer">
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full sm:w-56 px-8 text-base font-medium rounded-md border-border/80 hover:bg-muted cursor-pointer"
            >
              Learn More
            </Button>
          </a>
        </div>

        {!(openCount && openCount > 0) && (
          <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both">
            <HandHeart className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Subscribe below for Community Day and meetup volunteer updates
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Immich Photo Carousel Background */}
      <ImmichKioskBackground
        kioskUrl={kioskUrl}
        randomizeAlbumOnVisit={true}
      />
    </section>
  );
}
