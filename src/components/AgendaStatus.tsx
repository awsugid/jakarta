"use client";

import React from "react";
import { ArrowRight, Ticket, CalendarClock } from "lucide-react";

export function AgendaStatus({
  ctaCfpHref = "#cfp",
  ctaTicketHref = "#tickets",
  eta = "Early October 2026",
}: {
  ctaCfpHref?: string;
  ctaTicketHref?: string;
  eta?: string;
}) {
  return (
    <div className="bg-card/50 border border-border rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
      <div className="max-w-sm mx-auto">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-5">
          <CalendarClock className="h-6 w-6 text-white" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          Schedule coming soon
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base mb-1">
          We're finalizing speakers and sessions.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Expected by{" "}
          <span className="text-foreground font-semibold">{eta}</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={ctaTicketHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Ticket className="h-4 w-4" />
            Get your ticket
          </a>
          <a
            href={ctaCfpHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            Submit a talk
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default AgendaStatus;