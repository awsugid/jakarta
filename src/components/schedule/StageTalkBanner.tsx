import React from "react";
import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
import { StageMonasLogo } from "./StageMonasLogo";
import { SpeakerPortraitCutout } from "./SpeakerPortraitCutout";
import { formatTimeRangeWib } from "./schedule-stage-helpers";
import { roomLabelOf } from "@/components/community-day/schedule-calendar-helpers";
import { ArrowRight } from "lucide-react";

interface StageTalkBannerProps {
  session: DisplayScheduleSession;
  upcomingSession?: DisplayScheduleSession | null;
}

export function StageTalkBanner({ session, upcomingSession }: StageTalkBannerProps) {
  const primarySpeaker = session.speakers[0];
  const coSpeakers = session.speakers.slice(1);
  const formatBadgeText =
    session.sessionType || (session.isServiceSession ? "SERVICE" : "TALK");

  // Format speaker name onto 2 lines if has 2+ words
  const speakerName = primarySpeaker?.name || "Featured Builder";
  const nameParts = speakerName.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");

  const speakerRole =
    primarySpeaker?.role && primarySpeaker?.company
      ? `${primarySpeaker.role} at ${primarySpeaker.company}`
      : primarySpeaker?.role || primarySpeaker?.company || "AWS Community Speaker";

  const roomText = roomLabelOf(session);
  const timeText = formatTimeRangeWib(session.startsAt, session.endsAt);

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-[#161128] text-white select-none">
      {/* Subtle atmospheric ambient glows */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] max-w-[850px] max-h-[850px] bg-[radial-gradient(circle,rgba(6,182,212,0.22)_0%,rgba(37,99,235,0.1)_40%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] bg-[radial-gradient(circle,rgba(76,29,149,0.25)_0%,rgba(88,28,135,0.08)_45%,transparent_75%)] pointer-events-none" />

      {/* TOP BAR: Brand + Format Pill */}
      <div className="relative z-20 flex items-center justify-between w-full">
        <StageMonasLogo />

        <div className="px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
          <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">
            {formatBadgeText}
          </span>
        </div>
      </div>

      {/* CENTER CONTENT: Speaker Name, Role, Title & Portrait */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center flex-1 my-2">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4 lg:space-y-6">
          {/* Speaker Name */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.4rem] font-bold tracking-tight text-white leading-[1.04]">
            {lastName ? (
              <>
                <span className="block">{firstName}</span>
                <span className="block">{lastName}</span>
              </>
            ) : (
              <span>{speakerName}</span>
            )}
          </h1>

          {/* Role and Organization */}
          <p className="text-lg sm:text-2xl md:text-3xl text-slate-300 font-normal leading-snug">
            {speakerRole}
          </p>

          {/* Co-speakers if dual presenter */}
          {coSpeakers.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-sm sm:text-base text-slate-300">
              <span className="text-purple-300 font-semibold text-xs tracking-wider uppercase">With:</span>
              {coSpeakers.map((s, idx) => (
                <span key={idx} className="font-medium">
                  {s.name} {s.role ? `(${s.role})` : ""}
                  {idx < coSpeakers.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}

          {/* Session Title (clean italic style matching Banner-Felicia.svg) */}
          <div className="pt-2">
            <h2 className="italic text-xl sm:text-2xl md:text-3xl lg:text-[2.2rem] text-slate-100 font-normal leading-relaxed max-w-2xl">
              {session.title}
            </h2>
          </div>
        </div>

        {/* Right Column: Speaker Cutout with Bottom Gradient Mask */}
        <div className="lg:col-span-5 h-full flex items-end justify-center lg:justify-end">
          <SpeakerPortraitCutout speaker={primarySpeaker} className="w-full h-full" />
        </div>
      </div>

      {/* MINIMAL FOOTER: Status, Time, Room, and Next Up */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10 text-slate-300">
        {/* Left: Time and Room */}
        <div className="flex items-center gap-3 text-sm sm:text-base font-medium">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            LIVE
          </span>
          <span className="text-white/30">•</span>
          <span className="text-white font-semibold">{timeText}</span>
          <span className="text-white/30">•</span>
          <span>{roomText}</span>
        </div>

        {/* Right: Up Next Preview */}
        {upcomingSession && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
            <span>Next:</span>
            <span className="text-slate-200 font-medium max-w-[280px] sm:max-w-[400px] truncate">
              {upcomingSession.title}
            </span>
            <span>({formatTimeRangeWib(upcomingSession.startsAt).split("–")[0].trim()})</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}
