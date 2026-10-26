import React from "react";
import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
import { StageMonasLogo } from "./StageMonasLogo";
import { formatTimeRangeWib } from "./schedule-stage-helpers";
import { Calendar, Sparkles, MapPin, ArrowRight } from "lucide-react";

interface StageStandbyBannerProps {
  isPreEvent: boolean;
  upcomingSession?: DisplayScheduleSession | null;
}

export function StageStandbyBanner({ isPreEvent, upcomingSession }: StageStandbyBannerProps) {
  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-[#161128] text-white select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[1000px] max-h-[1000px] bg-[radial-gradient(circle,rgba(147,51,234,0.25)_0%,rgba(14,165,233,0.15)_45%,transparent_75%)] pointer-events-none" />

      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between w-full">
        <StageMonasLogo />
        <div className="px-5 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-md">
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-purple-300 uppercase">
            {isPreEvent ? "DOORS OPENING SOON" : "CONFERENCE CONCLUDED"}
          </span>
        </div>
      </div>

      {/* CENTER WELCOME CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Binus @Anggrek · Jakarta Barat</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight leading-tight">
          {isPreEvent ? "Welcome to Stage" : "Thank You Builders!"}
        </h1>

        <p className="text-xl sm:text-2xl text-slate-300 font-normal max-w-2xl">
          {isPreEvent
            ? "Connect to venue Wi-Fi: AWSCommunityDay · View live agenda on your phone at jakarta.awscommunity.id"
            : "Thank you for building with the AWS community in Jakarta! Submit feedback & join us at awscommunity.id"}
        </p>
      </div>

      {/* FOOTER UPCOMING */}
      <div className="relative z-20 flex items-center justify-between pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span>October 31, 2026 · 08:00 – 17:00 WIB</span>
        </div>

        {upcomingSession && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/15 px-5 py-2.5 rounded-xl">
            <span className="text-xs uppercase font-bold text-purple-300">Opening Next:</span>
            <span className="font-semibold text-white">{upcomingSession.title}</span>
            <span className="text-slate-400">({formatTimeRangeWib(upcomingSession.startsAt)})</span>
          </div>
        )}
      </div>
    </div>
  );
}
