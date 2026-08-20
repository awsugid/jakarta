"use client";

import React from "react";
import { PeopleList } from "@/components/people/PeopleList";
import type { PersonItem } from "@/components/people/PeopleList";

import { SAMPLE_VOLUNTEERS } from "@/data/volunteers";

interface VolunteerSpotlightProps {
  people?: PersonItem[];
}

export function VolunteerSpotlight({ people = SAMPLE_VOLUNTEERS }: VolunteerSpotlightProps) {
  return (
    <section className="relative py-20 bg-background overflow-hidden">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-900/15 rounded-full blur-[100px] pointer-events-none translate-y-1/2"
      />

      {/* Masked dot grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(#ff9900_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-[0.06] pointer-events-none"
      />

      <div className="container max-w-5xl mx-auto px-4 md:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center space-y-4 mb-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
            </span>
            Meet Our Volunteers
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            The People Powering Our Events
          </h2>

          <div className="w-20 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 mx-auto rounded-full" />

          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Our community is driven by passionate individuals who dedicate their
            time and expertise to make every AWS event a success.
          </p>
        </div>

        {/* People grid container */}
        <div className="bg-card/50 border border-border/70 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* Inner card subtle glow top-right */}
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-40 pointer-events-none -translate-y-1/2 translate-x-1/2"
          />
          <PeopleList groups={[{ label: "Volunteers", people }]} />
        </div>
      </div>
    </section>
  );
}
