"use client";

import React from "react";
import {
  Clock,
  MapPin,
  Calendar,
  Radio,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  formatTimeShort,
  groupSessionsIntoTimeSlots,
  roomLabelOf,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import { cn } from "@/lib/utils";

interface ScheduleFullscreenListProps {
  sessions: DisplayScheduleSession[];
  activeSessions: DisplayScheduleSession[];
  currentClock: Date;
  onSelectSession: (session: DisplayScheduleSession) => void;
  focusedSessionId?: string | null;
}

export function ScheduleFullscreenList({
  sessions,
  activeSessions,
  currentClock,
  onSelectSession,
  focusedSessionId,
}: ScheduleFullscreenListProps) {
  const timeSlots = groupSessionsIntoTimeSlots(sessions);
  const activeSessionIds = new Set(activeSessions.map((s) => s.id));
  const nowMs = currentClock.getTime();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {timeSlots.map((slot) => {
        const slotStart = slot.startsAt ? new Date(slot.startsAt).getTime() : 0;
        const slotEnd = slot.endsAt ? new Date(slot.endsAt).getTime() : 0;
        const isSlotActive = nowMs >= slotStart && nowMs < slotEnd;

        return (
          <div
            key={slot.slotKey}
            className={cn(
              "rounded-3xl border transition-all duration-200 overflow-hidden",
              isSlotActive
                ? "border-orange-500/80 bg-[#161a28]/95 shadow-[0_0_30px_rgba(255,153,0,0.25)] ring-1 ring-orange-500/30"
                : "border-white/10 bg-[#121520]/80 hover:border-white/20"
            )}
          >
            {/* Slot Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.04] border-b border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 font-mono text-base sm:text-lg font-black text-white">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>{slot.timeLabel}</span>
                </div>
                {slot.durationLabel && (
                  <span className="text-xs text-slate-400 font-medium">
                    ({slot.durationLabel})
                  </span>
                )}
              </div>

              {isSlotActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500 text-white animate-pulse shadow-md">
                  <Radio className="w-3.5 h-3.5" />
                  HAPPENING NOW
                </span>
              )}
            </div>

            {/* Sessions Grid in Slot */}
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slot.sessions.map((session) => {
                const isActive = activeSessionIds.has(session.id);
                const isFocused = focusedSessionId === session.id;
                const room = roomLabelOf(session);
                const speaker = session.speakers[0];
                const isWorkshop = (session.sessionType || "").toLowerCase().includes("workshop");

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className={cn(
                      "p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3",
                      isActive
                        ? "border-orange-500 bg-orange-950/40 shadow-lg ring-1 ring-orange-400"
                        : isFocused
                        ? "border-cyan-400 bg-cyan-950/30"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20"
                    )}
                  >
                    <div>
                      {/* Room & Format */}
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="inline-flex items-center gap-1 font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3" />
                          {room}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md font-semibold text-[11px]",
                            isWorkshop
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-white/10 text-slate-300"
                          )}
                        >
                          {session.sessionType || "Talk"}
                        </span>
                      </div>

                      {/* Title — Full uncropped title with proper line height */}
                      <h4 className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                        {session.title}
                      </h4>
                    </div>

                    {/* Speaker & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {speaker && (
                          <Avatar className="w-7 h-7 rounded-full border border-white/20 shrink-0 bg-slate-800">
                            {speaker.avatar && (
                              <AvatarImage
                                src={speaker.avatar}
                                alt={speaker.name}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <AvatarFallback className="bg-orange-600/30 text-orange-300 font-bold text-xs">
                              {speaker.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs font-medium text-slate-300 truncate">
                          {speaker ? speaker.name : "Featured Presentation"}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
