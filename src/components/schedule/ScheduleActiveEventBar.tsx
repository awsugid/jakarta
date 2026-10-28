"use client";

import React from "react";
import {
  Clock,
  Sparkles,
  MapPin,
  Coffee,
  Utensils,
  ChevronRight,
  Radio,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatTimeRangeWib,
  getMinutesRemaining,
} from "./schedule-stage-helpers";
import {
  roomLabelOf,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import { cn } from "@/lib/utils";

interface ScheduleActiveEventBarProps {
  activeSessions: DisplayScheduleSession[];
  primaryActiveSession: DisplayScheduleSession | null;
  upcomingSession: DisplayScheduleSession | null;
  isPreEvent: boolean;
  isPostEvent: boolean;
  currentClock: Date;
  onFocusSession: (session: DisplayScheduleSession) => void;
}

export function ScheduleActiveEventBar({
  activeSessions,
  primaryActiveSession,
  upcomingSession,
  isPreEvent,
  isPostEvent,
  currentClock,
  onFocusSession,
}: ScheduleActiveEventBarProps) {
  // Case 1: Pre-event (Doors opening soon)
  if (isPreEvent) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-950/40 via-[#151824] to-purple-950/40 border-b border-purple-500/20 px-4 py-2.5 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Doors Opening Soon
            </span>
            <span className="text-slate-300 font-medium">
              Binus University @Anggrek • Wi-Fi: <strong className="text-white">AWSCommunityDay</strong>
            </span>
          </div>

          {upcomingSession && (
            <button
              type="button"
              onClick={() => onFocusSession(upcomingSession)}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer group"
            >
              <span className="text-slate-400">First Session:</span>
              <span className="font-bold text-orange-400 group-hover:underline">
                {upcomingSession.title}
              </span>
              <span className="text-slate-400">
                ({formatTimeRangeWib(upcomingSession.startsAt).split("–")[0].trim()})
              </span>
              <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Post-event
  if (isPostEvent) {
    return (
      <div className="w-full bg-[#151824] border-b border-white/10 px-4 py-2.5 text-center text-xs sm:text-sm text-slate-300">
        <span className="font-bold text-white">Conference Concluded.</span> Thank you for building with the AWS community in Jakarta!
      </div>
    );
  }

  // Case 3: Service session (Break / Lunch / Networking)
  const isServiceBreak =
    primaryActiveSession?.isServiceSession ||
    activeSessions.some((s) => s.isServiceSession && (s.title || "").toLowerCase().includes("lunch"));

  if (isServiceBreak && primaryActiveSession) {
    const endsAt = primaryActiveSession.endsAt ? new Date(primaryActiveSession.endsAt) : null;
    const minsLeft = endsAt ? getMinutesRemaining(endsAt, currentClock) : 0;
    const isLunch = (primaryActiveSession.title || "").toLowerCase().includes("lunch");
    const Icon = isLunch ? Utensils : Coffee;

    return (
      <div className="w-full bg-gradient-to-r from-orange-950/40 via-[#151824] to-orange-950/40 border-b border-orange-500/30 px-4 py-3 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                  IN PROGRESS
                </span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {primaryActiveSession.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {primaryActiveSession.description || "Networking active in Main Foyer • Refreshments Available"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-xs sm:text-sm font-semibold text-white">
                Resumes at <strong className="text-orange-400">{formatTimeRangeWib(primaryActiveSession.endsAt).split(" ")[0]} WIB</strong>
              </span>
              {minsLeft > 0 && (
                <span className="text-xs font-bold text-orange-300 bg-orange-500/25 px-2 py-0.5 rounded-md">
                  {minsLeft}m left
                </span>
              )}
            </div>

            {upcomingSession && (
              <button
                type="button"
                onClick={() => onFocusSession(upcomingSession)}
                className="hidden lg:flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span className="text-slate-400">Next Session:</span>
                <span className="font-semibold text-slate-200 max-w-[200px] truncate">
                  {upcomingSession.title}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Live Talk or Plenary Session(s)
  if (activeSessions.length > 0) {
    return (
      <div className="w-full bg-[#121520] border-b border-orange-500/40 px-3 py-2 sm:px-6 shadow-md relative overflow-hidden">
        {/* Glow backdrop indicator */}
        <div className="absolute top-0 left-0 w-32 h-full bg-orange-500/10 blur-xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              ACTIVE NOW
            </span>
            <span className="text-slate-500 text-xs hidden sm:inline">•</span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              {activeSessions.length} {activeSessions.length === 1 ? "session" : "parallel sessions"} in progress
            </span>
          </div>

          {/* Active Session Cards List */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-0.5 flex-1 max-w-4xl">
            {activeSessions.map((session) => {
              const speaker = session.speakers[0];
              const room = roomLabelOf(session);
              const endsAt = session.endsAt ? new Date(session.endsAt) : null;
              const minsLeft = endsAt ? getMinutesRemaining(endsAt, currentClock) : 0;

              return (
                <div
                  key={session.id}
                  onClick={() => onFocusSession(session)}
                  className="flex items-center gap-3 p-2 pr-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-orange-500/30 hover:border-orange-500/60 transition-all cursor-pointer shrink-0 max-w-[340px] group shadow-sm"
                  title="Click to locate on schedule"
                >
                  <Avatar className="w-9 h-9 rounded-lg border border-white/20 shrink-0 bg-slate-800">
                    {speaker?.avatar && (
                      <AvatarImage
                        src={speaker.avatar}
                        alt={speaker.name}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="bg-orange-600/30 text-orange-300 font-bold text-xs">
                      {speaker?.name?.slice(0, 2).toUpperCase() || "SP"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-1.5 py-0.2 rounded">
                        {room}
                      </span>
                      {minsLeft > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {minsLeft}m left
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white truncate group-hover:text-orange-300 transition-colors">
                      {session.title}
                    </p>
                    <p className="text-[11px] text-slate-300 truncate">
                      {speaker ? speaker.name : "Featured Presentation"}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              );
            })}
          </div>

          {/* Up Next Pill */}
          {upcomingSession && (
            <button
              type="button"
              onClick={() => onFocusSession(upcomingSession)}
              className="hidden xl:flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 pl-2 border-l border-white/10"
            >
              <span>Next:</span>
              <span className="text-slate-200 font-medium max-w-[180px] truncate">
                {upcomingSession.title}
              </span>
              <span className="text-slate-400">
                ({formatTimeRangeWib(upcomingSession.startsAt).split("–")[0].trim()})
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback (e.g. between sessions or unscheduled gap)
  return null;
}
