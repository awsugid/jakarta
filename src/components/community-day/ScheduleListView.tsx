"use client";

import React from "react";
import {
  CalendarPlus,
  Clock,
  MapPin,
  Star,
  Download,
  ChevronDown,
  Building,
  Globe,
  Gauge,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatTime,
  formatTimeShort,
  getDurationMinutes,
  formatDuration,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  roomLabelOf,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";

interface ScheduleListViewProps {
  sessions: DisplayScheduleSession[];
  savedSessionIds: string[];
  expandedSessionIds: Record<string, boolean>;
  onToggleBookmark: (sessionId: string, e?: React.MouseEvent) => void;
  onToggleExpand: (sessionId: string, e?: React.MouseEvent) => void;
}

export function ScheduleListView({
  sessions,
  savedSessionIds,
  expandedSessionIds,
  onToggleBookmark,
  onToggleExpand,
}: ScheduleListViewProps) {
  return (
    <div className="space-y-3.5">
      {sessions.map((session) => {
        const isSaved = savedSessionIds.includes(session.id);
        const isExpanded = expandedSessionIds[session.id] || false;
        const durationMin = getDurationMinutes(session.startsAt, session.endsAt);
        const startTimeStr = formatTimeShort(session.startsAt);
        const durationOrEnd = durationMin
          ? formatDuration(durationMin)
          : formatTimeShort(session.endsAt);

        const roomRaw = (session.rooms?.[0] || session.room || "").toLowerCase();
        const isAtrium = roomRaw.includes("atrium");

        return (
          <div
            key={session.id}
            className={cn(
              "schedule-list-item rounded-2xl border transition-all duration-200 overflow-hidden",
              isExpanded
                ? "is-expanded border-orange-500/50 bg-card/90 shadow-lg ring-1 ring-orange-500/20"
                : "border-border/70 bg-card/40 hover:bg-card/75 hover:border-border"
            )}
          >
            {/* Spacious Header Row */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleExpand(session.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleExpand(session.id);
                }
              }}
              className="schedule-list-header p-4 sm:p-5 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              aria-expanded={isExpanded}
              aria-controls={`detail-${session.id}`}
            >
              {/* Left Block: Time Column + Info Column */}
              <div className="flex items-start gap-4 md:gap-6 min-w-0 flex-1">
                {/* Time Box */}
                <div className="shrink-0 w-20 md:w-28 space-y-0.5">
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-foreground tracking-tight block">
                    {startTimeStr}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium block">
                    {durationOrEnd}
                  </span>
                </div>

                {/* Title, Track & Speakers */}
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Badges line */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        isAtrium
                          ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                          : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      )}
                    >
                      {roomLabelOf(session) || "Main Stage"}
                    </span>

                    {session.sessionType && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {session.sessionType}
                      </span>
                    )}

                    {session.track && (
                      <span className="text-xs text-muted-foreground/80 hidden sm:inline-block">
                        • {session.track}
                      </span>
                    )}

                    {session.languages.map((l) => (
                      <span
                        key={l}
                        className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/40 font-medium"
                      >
                        {l}
                      </span>
                    ))}

                    {session.levels.map((lvl) => (
                      <span
                        key={lvl}
                        className="text-[10px] text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 font-medium"
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>

                  {/* Session Title */}
                  <h4 className="text-base sm:text-lg md:text-xl font-bold text-foreground hover:text-orange-400 transition-colors leading-snug">
                    {session.title}
                  </h4>

                  {/* Speaker Line and Description Preview (Collapsed preview) */}
                  {!isExpanded && (
                    <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                      {session.speakers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {session.speakers.map((s) => s.name).join(", ")}
                          </span>
                          {session.speakers[0]?.company && (
                            <span className="text-muted-foreground/80">
                              ({session.speakers[0].company})
                            </span>
                          )}
                        </div>
                      )}
                      {session.description && (
                        <p className="line-clamp-1 text-slate-300/80">
                          {session.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Block: Bookmark Button & Animated Chevron */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => onToggleBookmark(session.id, e)}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer border",
                    isSaved
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "text-muted-foreground/60 border-border/40 hover:text-foreground hover:bg-muted"
                  )}
                  title={isSaved ? "Remove from my itinerary" : "Save session"}
                  aria-label={isSaved ? "Remove bookmark" : "Bookmark session"}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      isSaved ? "fill-amber-400 text-amber-400" : ""
                    )}
                  />
                </button>

                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground transition-transform duration-200">
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isExpanded && "rotate-180 text-orange-400"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Smooth In-Place Detail Expansion (No Modal Dialog!) */}
            <div className="schedule-list-detail" id={`detail-${session.id}`}>
              <div>
                <div className="p-4 sm:p-5 md:p-6 pt-2 border-t border-border/50 bg-background/40 space-y-4">
                  {/* Overview / Abstract */}
                  {session.description && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                        Session Overview
                      </h5>
                      <p className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-line">
                        {session.description}
                      </p>
                    </div>
                  )}

                  {/* Speaker Spotlight Cards */}
                  {session.speakers.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Featured Speaker{session.speakers.length > 1 ? "s" : ""}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {session.speakers.map((sp) => (
                          <div
                            key={sp.id || sp.name}
                            className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-orange-500/40 transition-colors"
                          >
                            <Avatar className="h-12 w-12 rounded-lg border border-border shrink-0">
                              <AvatarImage
                                src={sp.avatarUrl || undefined}
                                alt={sp.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="rounded-lg text-sm font-bold bg-primary/10 text-primary">
                                {sp.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h6 className="text-sm font-bold text-foreground truncate">
                                  {sp.name}
                                </h6>
                                {sp.socialUrl && (
                                  <a
                                    href={sp.socialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-orange-400 p-0.5 rounded cursor-pointer"
                                    title="Speaker profile"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                              {(sp.role || sp.company) && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                  {sp.company && (
                                    <Building className="h-3 w-3 shrink-0 text-orange-400" />
                                  )}
                                  <span className="truncate">
                                    {[sp.role, sp.company].filter(Boolean).join(" at ")}
                                  </span>
                                </p>
                              )}
                              {sp.bio && (
                                <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1">
                                  {sp.bio}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata Row: Room, Exact Time, Language, Level */}
                  <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-orange-400" />
                      <span>{formatTime(session.startsAt, session.endsAt)} (Asia/Jakarta)</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-orange-400" />
                      <span>{roomLabelOf(session) || "Main Stage"}</span>
                    </span>

                    {session.languages.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-orange-400" />
                        <span>{session.languages.join(", ")}</span>
                      </span>
                    )}

                    {session.levels.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 text-orange-400" />
                        <span>Level: {session.levels.join(", ")}</span>
                      </span>
                    )}
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/40">
                    <Button
                      type="button"
                      variant={isSaved ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => onToggleBookmark(session.id, e)}
                      className={cn(
                        "h-9 px-4 text-xs font-semibold cursor-pointer",
                        isSaved ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                      )}
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5 mr-1.5",
                          isSaved ? "fill-white text-white" : ""
                        )}
                      />
                      {isSaved ? "Saved in Itinerary" : "Save Talk"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-9 px-4 text-xs font-medium cursor-pointer"
                    >
                      <a
                        href={generateGoogleCalendarUrl(session)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
                        Add to Google Calendar
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadIcsFile(
                          [session],
                          `${session.title.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "-")}.ics`
                        )
                      }
                      className="h-9 px-4 text-xs font-medium cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 mr-1 text-orange-400" />
                      Download .ICS
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
