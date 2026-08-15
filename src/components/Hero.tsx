import React from "react";
import { Calendar, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImmichKioskBackground } from "@/components/ImmichKioskBackground";

interface HeroProps {
  kioskUrl?: string;
}

export function Hero({ kioskUrl }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-24 lg:py-40 bg-background">
      <div className="container mx-auto relative z-10 flex flex-col items-center text-center px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
          <Badge
            variant="outline"
            className="mb-6 py-1.5 px-4 text-sm backdrop-blur-sm bg-background/50 border-muted-foreground/20"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Official AWS User Group
          </Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 fill-mode-both text-foreground">
          AWS User Group <span className="text-primary">Jakarta</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          Join Indonesia's largest community of AWS builders. Learn, share, and
          connect with fellow developers, architects, and cloud enthusiasts.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both w-full sm:w-auto">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-orange-500/20"
          >
            <a
              href="https://www.meetup.com/aws-ug-jakarta"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Community
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base border-input bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground shadow-sm"
          >
            <a href="/events">
              <Calendar className="mr-2 h-5 w-5" />
              See Upcoming Events
            </a>
          </Button>
        </div>
      </div>

      {/* Dynamic Immich Community Photo Carousel Background */}
      <ImmichKioskBackground
        kioskUrl={kioskUrl}
        randomizeAlbumOnVisit={true}
      />
    </section>
  );
}
