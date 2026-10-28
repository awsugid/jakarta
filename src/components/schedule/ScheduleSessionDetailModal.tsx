"use client";

import React, { useEffect } from "react";
import {
  X,
  Clock,
  MapPin,
  CalendarPlus,
  Download,
  Building,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatTime,
  roomLabelOf,
  getDurationMinutes,
  formatDuration,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import { cn } from "@/lib/utils";

interface ScheduleSessionDetailModalProps {
  session: DisplayScheduleSession | null;
  onClose: () => void;
  isActiveNow?: boolean;
}

export function ScheduleSessionDetailModal({
  session,
  onClose,
  isActiveNow = false,
}: ScheduleSessionDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!session) return null;

  const durationMin = getDurationMinutes(session.startsAt, session.endsAt);
  const timeString = formatTime(session.startsAt, session.endsAt);
  const roomString = roomLabelOf(session);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141824] border p-6 sm:p-8 text-white shadow-2xl space-y-6",
          isActiveNow
            ? "border-orange-500 shadow-[0_0_40px_rgba(255,153,0,0.35)]"
            : "border-white/15"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Status & Badges */}
        <div className="flex items-center gap-2.5 flex-wrap pr-10">
          {isActiveNow && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500 text-white shadow-[0_0_12px_rgba(255,153,0,0.6)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              LIVE NOW
            </span>
          )}

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 text-slate-200">
            {session.sessionType || (session.isServiceSession ? "Service" : "Talk")}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-400">
            <MapPin className="w-3.5 h-3.5" />
            {roomString}
          </span>

          {durationMin > 0 && (
            <span className="text-xs text-slate-400 font-medium">
              • {formatDuration(durationMin)}
            </span>
          )}
        </div>

        {/* Session Title */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {session.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>{timeString}</span>
          </div>
        </div>

        {/* Speakers Section */}
        {session.speakers.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              {session.speakers.length === 1 ? "Speaker" : "Speakers"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {session.speakers.map((sp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10"
                >
                  <Avatar className="w-12 h-12 rounded-xl border border-white/15 shrink-0 bg-slate-800">
                    {sp.avatar && (
                      <AvatarImage
                        src={sp.avatar}
                        alt={sp.name}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="bg-orange-600/30 text-orange-300 font-bold text-sm">
                      {sp.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm sm:text-base text-white truncate">
                      {sp.name}
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {sp.role && sp.company ? `${sp.role} at ${sp.company}` : sp.role || sp.company || "Speaker"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Description */}
        {session.description && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              About This Session
            </h4>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
              {session.description}
            </p>
          </div>
        )}

        {/* Meta tags: languages & levels */}
        {(session.languages.length > 0 || session.levels.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/10">
            {session.languages.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300"
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                {l}
              </span>
            ))}
            {session.levels.map((lvl) => (
              <span
                key={lvl}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-slate-300"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                {lvl}
              </span>
            ))}
          </div>
        )}

        {/* Calendar Export Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              const url = generateGoogleCalendarUrl(session);
              if (url) window.open(url, "_blank");
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Add to Google Calendar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadIcsFile([session], `${session.title.slice(0, 30)}.ics`)}
            className="border-white/20 hover:bg-white/10 text-white cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2 text-orange-400" />
            Export .ICS
          </Button>
        </div>
      </div>
    </div>
  );
}
