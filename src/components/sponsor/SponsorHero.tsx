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
    <section className="relative overflow-hidden py-24 lg:py-32 bg-background">
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
          Collaborate with <span className="text-primary">Us</span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both leading-relaxed">
          AWS User Group Jakarta is always open for collaboration. Whether
          you're a company looking to reach cloud professionals or an individual
          wanting to contribute, there are many ways to partner with us.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300 fill-mode-both">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50"
            >
              <metric.icon className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">
                {metric.value}
              </span>
              <span className="text-xs text-muted-foreground">
                {metric.label}
              </span>
            </div>
          ))}
        </div>
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
