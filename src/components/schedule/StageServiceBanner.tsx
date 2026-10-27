import React from "react";
import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
import { StageMonasLogo } from "./StageMonasLogo";
import { formatTimeRangeWib, getMinutesRemaining } from "./schedule-stage-helpers";
import { Utensils, Coffee, Sparkles, Clock, ArrowRight } from "lucide-react";

interface StageServiceBannerProps {
  session: DisplayScheduleSession;
  nextSessions: DisplayScheduleSession[];
  currentTime: Date;
}

export function StageServiceBanner({ session, nextSessions, currentTime }: StageServiceBannerProps) {
  const endsAtDate = session.endsAt ? new Date(session.endsAt) : null;
  const minsRemaining = endsAtDate ? getMinutesRemaining(endsAtDate, currentTime) : 0;
  const nextSession = nextSessions[0];

  // Choose icon based on service title
  const tLower = session.title.toLowerCase();
  const IconComponent = tLower.includes("lunch") || tLower.includes("food")
    ? Utensils
    : tLower.includes("coffee") || tLower.includes("break")
    ? Coffee
    : Sparkles;

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-[#161128] text-white select-none">
      {/* Soft atmospheric background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] bg-[radial-gradient(circle,rgba(168,85,247,0.18)_0%,rgba(59,130,246,0.08)_40%,transparent_70%)] pointer-events-none" />

      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between w-full">
        <StageMonasLogo />
        <div className="px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
          <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
            BREAK
          </span>
        </div>
      </div>

      {/* CENTER STAGE CONTENT: Clean, focused, high contrast */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-auto space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-orange-400">
          <IconComponent className="w-8 h-8" />
        </div>

        {/* Big session title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight leading-tight">
          {session.title}
        </h1>

        {/* Clean subtitle */}
        <p className="text-lg sm:text-2xl text-slate-300 font-normal max-w-xl">
          {session.description || "Networking active in Main Foyer • Refreshments Available"}
        </p>

        {/* Prominent Resumption Callout (High Visibility for Stage & Projector Screens) */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 px-8 sm:px-12 py-5 sm:py-6 rounded-2xl bg-white/[0.08] border-2 border-orange-500/40 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="text-left">
              <span className="block text-xs sm:text-sm font-bold uppercase tracking-widest text-orange-300">
                Next Stage Transition
              </span>
              <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {session.endsAt ? (
                  <>
                    Sessions resume at{" "}
                    <span className="text-orange-400 underline decoration-orange-500/40 underline-offset-4">
                      {formatTimeRangeWib(session.endsAt).split(" ")[0]} WIB
                    </span>
                  </>
                ) : (
                  "Sessions in Progress"
                )}
              </div>
            </div>
          </div>

          {minsRemaining > 0 && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/25 border border-orange-400/50 text-orange-300 shrink-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
              <span className="text-lg sm:text-2xl font-black tracking-tight">
                {minsRemaining} min left
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MINIMAL FOOTER: Next Session Starting Soon */}
      <div className="relative z-20 pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-slate-400">
        <span>AWS Community Day Jakarta 2026</span>
        {nextSession && (
          <div className="flex items-center gap-2">
            <span>Next session:</span>
            <span className="text-white font-medium">{nextSession.title}</span>
            <span>({formatTimeRangeWib(nextSession.startsAt).split("–")[0].trim()})</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}
