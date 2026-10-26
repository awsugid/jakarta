import React from "react";
import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
import { StageMonasLogo } from "./StageMonasLogo";
import { formatTimeRangeWib, getMinutesRemaining } from "./schedule-stage-helpers";
import { Utensils, Coffee, Sparkles, Clock, Calendar, ArrowRight } from "lucide-react";

interface StageServiceBannerProps {
  session: DisplayScheduleSession;
  nextSessions: DisplayScheduleSession[];
  currentTime: Date;
}

export function StageServiceBanner({ session, nextSessions, currentTime }: StageServiceBannerProps) {
  const endsAtDate = session.endsAt ? new Date(session.endsAt) : null;
  const minsRemaining = endsAtDate ? getMinutesRemaining(endsAtDate, currentTime) : 0;

  // Choose icon based on service title
  const tLower = session.title.toLowerCase();
  const IconComponent = tLower.includes("lunch") || tLower.includes("food")
    ? Utensils
    : tLower.includes("coffee") || tLower.includes("break")
    ? Coffee
    : Sparkles;

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-[#161128] text-white select-none">
      {/* Center atmospheric glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-[radial-gradient(circle,rgba(168,85,247,0.25)_0%,rgba(59,130,246,0.15)_40%,transparent_70%)] pointer-events-none" />

      {/* TOP BRAND BAR */}
      <div className="relative z-20 flex items-center justify-between w-full">
        <StageMonasLogo />
        <div className="px-6 py-2 rounded-full border border-orange-500/40 bg-orange-500/10 backdrop-blur-md">
          <span className="text-sm sm:text-base font-semibold tracking-[0.18em] text-orange-400 uppercase">
            COMMUNITY INTERMISSION
          </span>
        </div>
      </div>

      {/* CENTER SERVICE CARD */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-8 space-y-6">
        {/* Thematic glowing icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-orange-500 p-1 shadow-2xl shadow-purple-900/60 flex items-center justify-center">
          <div className="w-full h-full bg-[#161128] rounded-full flex items-center justify-center">
            <IconComponent className="w-10 h-10 text-orange-400 animate-pulse" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
          {session.title}
        </h1>

        {/* Subtitle description */}
        <p className="text-lg sm:text-2xl text-slate-300 font-normal max-w-xl">
          {session.description || "Networking active in Main Foyer • Partner Booths Open • Refreshments Available"}
        </p>

        {/* Resumption countdown pill */}
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
          <Clock className="w-5 h-5 text-orange-400" />
          <span className="text-base sm:text-lg font-semibold text-white">
            {session.endsAt ? `Sessions resume at ${formatTimeRangeWib(session.endsAt).split(" ")[0]} WIB` : "In Progress"}
          </span>
          {minsRemaining > 0 && (
            <span className="text-sm font-bold text-orange-300 bg-orange-500/20 px-3 py-0.5 rounded-full">
              {minsRemaining}m remaining
            </span>
          )}
        </div>
      </div>

      {/* BOTTOM UPCOMING HIGHLIGHTS */}
      <div className="relative z-20 pt-4 border-t border-white/10">
        <div className="text-xs uppercase tracking-widest text-purple-300 font-bold mb-3 flex items-center gap-2">
          <span>Upcoming Highlights Resuming Soon</span>
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nextSessions.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between hover:bg-white/10 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{formatTimeRangeWib(item.startsAt, item.endsAt)}</span>
                  <span className="text-purple-300 font-semibold">{item.room || "Room 800"}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                  {item.title}
                </h3>
              </div>
              {item.speakers[0] && (
                <div className="mt-2 text-xs text-slate-300 font-medium">
                  {item.speakers[0].name} {item.speakers[0].company ? `· ${item.speakers[0].company}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
