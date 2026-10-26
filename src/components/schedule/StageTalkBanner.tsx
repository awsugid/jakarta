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
      {/* Cosmic background glows */}
      <div className="absolute top-0 right-0 w-[55vw] h-[55vw] max-w-[900px] max-h-[900px] bg-[radial-gradient(circle,rgba(6,182,212,0.3)_0%,rgba(37,99,235,0.15)_40%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] bg-[radial-gradient(circle,rgba(76,29,149,0.35)_0%,rgba(88,28,135,0.15)_45%,transparent_75%)] pointer-events-none" />

      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between w-full">
        {/* Monas Hexagon Brand */}
        <StageMonasLogo />

        {/* Format Pill Badge matching Banner-Felicia.svg */}
        <div className="px-6 py-2.5 rounded-full border border-white/40 bg-white/5 backdrop-blur-md shadow-lg shadow-black/20">
          <span className="text-sm sm:text-base lg:text-lg font-semibold tracking-[0.2em] text-white uppercase">
            {formatBadgeText}
          </span>
        </div>
      </div>

      {/* CENTER STAGE CONTENT */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1 my-4">
        {/* Left Column: Speaker Name, Subtitle, Italic Talk Title */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-5 lg:space-y-7 animate-in fade-in duration-500">
          {/* Hero Speaker Name */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-bold tracking-tight text-white leading-[1.04] drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            {lastName ? (
              <>
                <span className="block">{firstName}</span>
                <span className="block">{lastName}</span>
              </>
            ) : (
              <span>{speakerName}</span>
            )}
          </h1>

          {/* Role and Organization Subtitle */}
          <p className="text-lg sm:text-2xl md:text-3xl text-slate-200 font-normal leading-snug drop-shadow-sm">
            {speakerRole}
          </p>

          {/* Co-speakers footnote if dual presenter */}
          {coSpeakers.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold">With:</span>
              {coSpeakers.map((s, idx) => (
                <span key={idx} className="text-base text-slate-300 font-medium bg-white/10 px-3 py-1 rounded-full border border-white/15">
                  {s.name} {s.role ? `(${s.role})` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Elegant Italic Talk Title */}
          <div className="pt-2">
            <h2 className="italic text-xl sm:text-2xl md:text-3xl lg:text-4xl text-slate-50 font-normal leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              {session.title}
            </h2>
          </div>
        </div>

        {/* Right Column: Speaker Cutout with Gradient Feather Mask */}
        <div className="lg:col-span-5 h-full flex items-end justify-center lg:justify-end">
          <SpeakerPortraitCutout speaker={primarySpeaker} className="w-full h-full" />
        </div>
      </div>

      {/* FOOTER BAR: Active Time Slot + Up Next Preview */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
        {/* Left: Live pulsing badge, Time Range, Room */}
        <div className="flex items-center gap-3 sm:gap-4 bg-white/5 border border-white/15 backdrop-blur-md px-4 sm:px-6 py-2.5 rounded-2xl">
          <span className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            LIVE
          </span>

          <span className="h-4 w-px bg-white/20" />

          <span className="text-sm sm:text-lg font-semibold text-white tracking-wide">
            {timeText}
          </span>

          <span className="h-4 w-px bg-white/20" />

          <span className="text-sm sm:text-lg font-medium text-slate-300">
            {roomText}
          </span>
        </div>

        {/* Right: Up Next Preview Ticker */}
        {upcomingSession && (
          <div className="flex items-center gap-2.5 text-xs sm:text-sm md:text-base text-slate-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
            <span className="font-semibold text-purple-300">Up Next:</span>
            <span className="font-medium text-white max-w-[260px] sm:max-w-[360px] truncate">
              {upcomingSession.title}
            </span>
            <span className="text-slate-400">at {formatTimeRangeWib(upcomingSession.startsAt).split("–")[0]}</span>
            <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
