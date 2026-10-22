"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  CalendarPlus,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Star,
  Download,
  ExternalLink,
  LayoutGrid,
  ListFilter,
  ChevronDown,
  ChevronUp,
  Building,
  AlertCircle,
  Loader2,
  X,
  Trash2,
  Globe,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchPublicSchedule } from "@/lib/api";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import { cn } from "@/lib/utils";
import {
  formatTime,
  formatDateLabel,
  getDurationMinutes,
  formatDuration,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  getFormatBadgeClass,
  getRoomBadgeClass,
  roomLabelOf,
  groupSessionsIntoTimeSlots,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";

interface ComDayScheduleProps {
  eventSlug?: string;
  className?: string;
}

const STORAGE_KEY = "comday26_saved_sessions";

export function ComDaySchedule({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  className,
}: ComDayScheduleProps) {
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'grid' (Matrix) | 'timeline' (List rail) | 'my-schedule' (Bookmarked itinerary)
  const [viewMode, setViewMode] = useState<"grid" | "timeline" | "my-schedule">("grid");

  // Filters & Search
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Bookmarks (Saved Sessions)
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  // Selected session for Detail Modal Dialog
  const [selectedSession, setSelectedSession] = useState<DisplayScheduleSession | null>(null);

  // Load bookmarks safely from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedSessionIds(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Toggle bookmark helper
  const toggleBookmark = useCallback((sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedSessionIds((prev) => {
      const exists = prev.includes(sessionId);
      const next = exists ? prev.filter((id) => id !== sessionId) : [...prev, sessionId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }, []);

  // Clear all bookmarks
  const clearAllBookmarks = useCallback(() => {
    setSavedSessionIds([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Fetch confirmed public schedule
  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      try {
        setLoading(true);
        setError(null);

        const d1Res = await fetchPublicSchedule(eventSlug);
        if (!cancelled) {
          const mapped: DisplayScheduleSession[] = (d1Res.schedule || []).map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            room: item.room,
            rooms: item.rooms ?? [],
            allRooms: Boolean(item.allRooms),
            track: item.track,
            sessionType: item.sessionType,
            isServiceSession: item.isServiceSession,
            speakers: normalizeScheduleSpeakers(item),
            languages: item.languages ?? [],
            levels: item.levels ?? [],
          }));
          setSessions(mapped);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load schedule");
          setSessions([]);
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  // Extract distinct stages/rooms (multi-room sessions contribute each room)
  const availableRooms = useMemo(() => {
    const s = new Set<string>();
    sessions.forEach((item) => {
      if (item.rooms.length > 0) {
        item.rooms.forEach((r) => r.trim() && s.add(r.trim()));
      } else if (item.room && item.room.trim()) {
        s.add(item.room.trim());
      }
    });
    return Array.from(s).sort();
  }, [sessions]);

  // Extract distinct session formats
  const availableFormats = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((item) => {
      if (item.sessionType && item.sessionType.trim()) {
        set.add(item.sessionType.trim());
      } else if (item.isServiceSession) {
        set.add("Service");
      }
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Filtered Sessions according to active view, stage, format, and search
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      // My Schedule view filter
      if (viewMode === "my-schedule") {
        if (!savedSessionIds.includes(sess.id)) return false;
      }

      // Room filter — all-rooms sessions appear under every stage
      if (selectedRoom !== "ALL") {
        const target = selectedRoom.toLowerCase();
        const inRooms =
          sess.rooms.some((r) => r.toLowerCase() === target) ||
          (!sess.rooms.length && (sess.room || "").toLowerCase() === target);
        if (!sess.allRooms && !inRooms) return false;
      }

      // Format filter
      if (selectedFormat !== "ALL") {
        if (selectedFormat === "Service" && !sess.isServiceSession) return false;
        if (selectedFormat !== "Service" && sess.sessionType !== selectedFormat) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = sess.title.toLowerCase().includes(q);
        const inDesc = (sess.description || "").toLowerCase().includes(q);
        const inSpeaker = sess.speakers.some(
          (sp) =>
            (sp.name || "").toLowerCase().includes(q) ||
            (sp.company || "").toLowerCase().includes(q)
        );
        const inRoom = (roomLabelOf(sess) || "").toLowerCase().includes(q);
        const inMeta = [...sess.languages, ...sess.levels].some((v) =>
          v.toLowerCase().includes(q)
        );
        if (!inTitle && !inDesc && !inSpeaker && !inRoom && !inMeta) return false;
      }

      return true;
    });
  }, [sessions, viewMode, savedSessionIds, selectedRoom, selectedFormat, searchQuery]);

  // Group filtered sessions into chronological time slots for Matrix view
  const timeSlots = useMemo(() => {
    return groupSessionsIntoTimeSlots(filteredSessions);
  }, [filteredSessions]);

  // Saved sessions list for export
  const savedSessions = useMemo(() => {
    return sessions.filter((s) => savedSessionIds.includes(s.id));
  }, [sessions, savedSessionIds]);

  // Total saved duration in minutes
  const totalSavedDurationMinutes = useMemo(() => {
    return savedSessions.reduce((acc, s) => {
      const dur = getDurationMinutes(s.startsAt, s.endsAt);
      return acc + (dur || 0);
    }, 0);
  }, [savedSessions]);

  const hasActiveFilters =
    selectedRoom !== "ALL" || selectedFormat !== "ALL" || searchQuery.trim().length > 0;

  const resetFilters = useCallback(() => {
    setSelectedRoom("ALL");
    setSelectedFormat("ALL");
    setSearchQuery("");
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* MINIMALIST HEADER & CONTROLS TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 text-xs">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "grid"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "timeline"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "timeline"}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("my-schedule")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer relative",
              viewMode === "my-schedule"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "my-schedule"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                savedSessionIds.length > 0 ? "text-amber-400 fill-amber-400" : ""
              )}
            />
            <span>Saved</span>
            {savedSessionIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {savedSessionIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Center: Stage Pills (Quick Track Selector) */}
        {viewMode !== "my-schedule" && availableRooms.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedRoom("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer",
                selectedRoom === "ALL"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              All Tracks
            </button>
            {availableRooms.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer",
                  selectedRoom === room
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    room.toLowerCase().includes("800") ? "bg-purple-400" : "bg-orange-400"
                  )}
                />
                <span>{room}</span>
              </button>
            ))}
          </div>
        )}

        {/* Right: Search Input & Export Button */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search talks, speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-6 h-7.5 text-xs bg-background/60 border-border/60 focus:border-orange-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {viewMode === "my-schedule" && savedSessions.length > 0 ? (
            <Button
              size="sm"
              onClick={() =>
                downloadIcsFile(savedSessions, "AWS-Community-Day-2026-My-Schedule.ics")
              }
              className="h-7.5 px-2.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Download className="h-3 w-3" />
              <span>Export .ICS</span>
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => downloadIcsFile(sessions, "AWS-Community-Day-2026-Agenda.ics")}
              className="h-7.5 px-2 rounded-lg border border-border/60 bg-background/40 hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Download entire agenda (.ics)"
            >
              <CalendarPlus className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER ACTIVE SUMMARY (Discreet & Minimalist) */}
      {hasActiveFilters && viewMode !== "my-schedule" && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>
            Filtered: <strong className="text-foreground">{filteredSessions.length}</strong> of{" "}
            {sessions.length} sessions
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-orange-400 hover:text-orange-300 font-medium cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-2">
          <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
          <p className="text-xs text-muted-foreground animate-pulse">Loading agenda...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-center space-y-1">
          <AlertCircle className="h-5 w-5 mx-auto" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      ) : viewMode === "my-schedule" && savedSessionIds.length === 0 ? (
        /* Empty State for Saved Itinerary */
        <div className="p-12 text-center border border-dashed border-border/60 bg-card/20 rounded-2xl space-y-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Star className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-semibold text-foreground">No bookmarked sessions</h4>
            <p className="text-xs text-muted-foreground">
              Click the star icon on any talk to save it here and build your personal schedule.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 px-3 text-xs bg-primary text-primary-foreground cursor-pointer"
          >
            Browse Schedule
          </Button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/60 bg-card/20 rounded-2xl space-y-2">
          <Calendar className="h-6 w-6 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">No talks found</h4>
          <p className="text-xs text-muted-foreground">Try clearing your search query or filters.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-orange-400 hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Banner for My Schedule View */}
          {viewMode === "my-schedule" && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{savedSessions.length}</strong> sessions
                bookmarked
                {totalSavedDurationMinutes > 0 &&
                  ` (~${formatDuration(totalSavedDurationMinutes)})`}
              </span>
              <button
                type="button"
                onClick={clearAllBookmarks}
                className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}

          {/* VIEW 1: MINIMALIST CALENDAR GRID MATRIX */}
          {viewMode === "grid" && (
            <div className="space-y-4">
              {/* Optional Room Track Headers on desktop */}
              {selectedRoom === "ALL" && availableRooms.length > 1 && (
                <div className="hidden md:grid grid-cols-2 gap-3 pb-1 border-b border-border/40 text-xs font-semibold text-muted-foreground px-1">
                  {availableRooms.map((room) => (
                    <div key={room} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          room.toLowerCase().includes("800") ? "bg-purple-400" : "bg-orange-400"
                        )}
                      />
                      <span className="text-foreground font-medium">{room}</span>
                    </div>
                  ))}
                </div>
              )}

              {timeSlots.map((slot) => {
                const isPlenarySlot = slot.isPlenary;
                const isSingleSession = slot.sessions.length === 1;

                return (
                  <div key={slot.slotKey} className="space-y-2">
                    {/* Time Slot Row Header */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-medium text-muted-foreground shrink-0">
                        {slot.timeLabel}
                      </span>
                      {slot.durationLabel && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          • {slot.durationLabel}
                        </span>
                      )}
                      <div className="h-px flex-1 bg-border/40" />
                    </div>

                    {/* Cards: Plenary Banner vs Parallel Breakout Columns */}
                    {isPlenarySlot || isSingleSession ? (
                      /* Plenary / Hero Banner Strip (Compact & Minimalist) */
                      <div className="space-y-2">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);

                          return (
                            <div
                              key={session.id}
                              onClick={() => setSelectedSession(session)}
                              className={cn(
                                "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs",
                                session.isServiceSession
                                  ? "bg-card/40 border-border/60 hover:bg-card/70 hover:border-emerald-500/30"
                                  : "bg-card/50 border-border/60 hover:bg-card/80 hover:border-orange-500/40"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 border",
                                    session.isServiceSession
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  )}
                                >
                                  {session.sessionType ||
                                    (session.isServiceSession ? "Rundown" : "Keynote")}
                                </span>

                                <h4 className="text-sm font-semibold text-foreground group-hover:text-orange-400 transition-colors truncate">
                                  {session.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                {session.speakers.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5 rounded-full border border-orange-500/30">
                                      <AvatarImage src={session.speakers[0].avatar || undefined} />
                                      <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                                        {session.speakers[0].name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate max-w-[130px]">
                                      {session.speakers.map((s) => s.name).join(", ")}
                                    </span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => toggleBookmark(session.id, e)}
                                  aria-label={
                                    isBookmarked ? "Remove bookmark" : "Bookmark session"
                                  }
                                  className={cn(
                                    "h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                                    isBookmarked
                                      ? "text-amber-400 bg-amber-500/10"
                                      : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
                                  )}
                                >
                                  <Star
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                    )}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Parallel Breakout Tracks (Sleek Compact Cards Side-by-Side) */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);
                          const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                          return (
                            <div
                              key={session.id}
                              onClick={() => setSelectedSession(session)}
                              className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 hover:border-orange-500/40 transition-all cursor-pointer shadow-2xs min-h-[105px]"
                            >
                              <div>
                                {/* Card Top Row: Room & Bookmark */}
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                                        getRoomBadgeClass(roomLabelOf(session))
                                      )}
                                    >
                                      {roomLabelOf(session)}
                                    </span>

                                    {session.sessionType && (
                                      <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/40">
                                        {session.sessionType}
                                      </span>
                                    )}

                                    {session.languages.map((l) => (
                                      <span
                                        key={l}
                                        className="text-[9px] text-muted-foreground/80 px-1 py-0.2 rounded bg-muted/30"
                                      >
                                        {l}
                                      </span>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => toggleBookmark(session.id, e)}
                                    aria-label={
                                      isBookmarked ? "Remove bookmark" : "Bookmark session"
                                    }
                                    className={cn(
                                      "h-6 w-6 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                      isBookmarked
                                        ? "text-amber-400 bg-amber-500/10"
                                        : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
                                    )}
                                  >
                                    <Star
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                                  {session.title}
                                </h4>
                              </div>

                              {/* Card Bottom Row: Speaker & Duration */}
                              <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-border/40 text-xs">
                                {session.speakers.length > 0 ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Avatar className="h-5 w-5 rounded-full border border-orange-500/30 shrink-0">
                                      <AvatarImage src={session.speakers[0].avatar || undefined} />
                                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                                        {session.speakers[0].name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {session.speakers[0].name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60">
                                    Community Day
                                  </span>
                                )}

                                {durationMin && (
                                  <span className="text-[11px] text-muted-foreground/70 shrink-0">
                                    {formatDuration(durationMin)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: MINIMALIST TIMELINE LIST (Also used for My Schedule) */}
          {(viewMode === "timeline" || viewMode === "my-schedule") && (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-border/60">
              {filteredSessions.map((session) => {
                const isExpanded = expandedIds[session.id] || false;
                const isBookmarked = savedSessionIds.includes(session.id);
                const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                return (
                  <div key={session.id} className="relative pl-7">
                    {/* Minimalist Timeline Dot */}
                    <div
                      className={cn(
                        "absolute left-3 top-5 -translate-x-1/2 w-2 h-2 rounded-full",
                        session.isServiceSession
                          ? "bg-emerald-400"
                          : session.allRooms
                          ? "bg-amber-400"
                          : "bg-orange-500"
                      )}
                    />

                    <div className="p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 hover:border-orange-500/40 transition-all group">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Top Meta Line */}
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-mono text-muted-foreground font-medium">
                              {formatTime(session.startsAt, session.endsAt)}
                            </span>

                            {roomLabelOf(session) && (
                              <span
                                className={cn(
                                  "px-2 py-0.2 rounded-md text-[10px] font-semibold border",
                                  getRoomBadgeClass(roomLabelOf(session))
                                )}
                              >
                                {roomLabelOf(session)}
                              </span>
                            )}

                            {session.sessionType && (
                              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.2 rounded bg-muted/40">
                                {session.sessionType}
                              </span>
                            )}

                            {durationMin && (
                              <span className="text-[10px] text-muted-foreground/60">
                                • {formatDuration(durationMin)}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4
                            onClick={() => setSelectedSession(session)}
                            className="text-base font-semibold text-foreground group-hover:text-orange-400 transition-colors cursor-pointer"
                          >
                            {session.title}
                          </h4>

                          {/* Minimalist Abstract Excerpt */}
                          {session.description && (
                            <div className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                              <p className={isExpanded ? "" : "line-clamp-2"}>
                                {session.description}
                              </p>
                              {session.description.length > 140 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((prev) => ({
                                      ...prev,
                                      [session.id]: !isExpanded,
                                    }))
                                  }
                                  className="text-orange-400 hover:text-orange-300 font-medium mt-1 cursor-pointer"
                                >
                                  {isExpanded ? "Show less" : "Read more"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Speaker Row in Timeline */}
                          {session.speakers.length > 0 && (
                            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                              <Avatar className="h-5 w-5 rounded-full border border-orange-500/30">
                                <AvatarImage src={session.speakers[0].avatar || undefined} />
                                <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                                  {session.speakers[0].name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {session.speakers.map((s) => s.name).join(", ")}
                                {session.speakers[0]?.company && (
                                  <span className="text-muted-foreground/60">
                                    {" "}
                                    ({session.speakers[0].company})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons on right */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(session.id, e)}
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer border",
                              isBookmarked
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "text-muted-foreground/60 border-border/40 hover:text-foreground hover:bg-muted"
                            )}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                          >
                            <Star
                              className={cn(
                                "h-3.5 w-3.5",
                                isBookmarked ? "fill-amber-400 text-amber-400" : ""
                              )}
                            />
                          </button>

                          <a
                            href={generateGoogleCalendarUrl(session)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/60 border border-border/40 hover:text-orange-400 hover:bg-muted transition-colors cursor-pointer"
                            title="Add to Google Calendar"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RICH SESSION DETAIL MODAL (Opens cleanly on card click) */}
      <Dialog
        open={Boolean(selectedSession)}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      >
        {selectedSession && (
          <DialogContent className="max-w-xl bg-card border-border/80 shadow-xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2.5 text-left">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    "text-[10px] font-semibold border shadow-2xs",
                    getFormatBadgeClass(selectedSession.sessionType)
                  )}
                >
                  {selectedSession.sessionType ||
                    (selectedSession.isServiceSession ? "Rundown" : "Technical Session")}
                </Badge>

                {roomLabelOf(selectedSession) && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs",
                      getRoomBadgeClass(roomLabelOf(selectedSession))
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {roomLabelOf(selectedSession)}
                  </span>
                )}

                {getDurationMinutes(selectedSession.startsAt, selectedSession.endsAt) && (
                  <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/40">
                    {formatDuration(
                      getDurationMinutes(selectedSession.startsAt, selectedSession.endsAt)
                    )}
                  </span>
                )}

                {selectedSession.languages.map((lang) => (
                  <span
                    key={lang}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50 font-medium"
                  >
                    {lang}
                  </span>
                ))}

                {selectedSession.levels.map((lvl) => (
                  <span
                    key={lvl}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium"
                  >
                    {lvl}
                  </span>
                ))}
              </div>

              {/* Title */}
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                {selectedSession.title}
              </DialogTitle>

              <DialogDescription className="sr-only">
                Details for {selectedSession.title}
              </DialogDescription>
            </DialogHeader>

            {/* Time & Venue Banner */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
                  <span>{formatDateLabel(selectedSession.startsAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-orange-400" />
                  <span>
                    {formatTime(selectedSession.startsAt, selectedSession.endsAt)} (Asia/Jakarta)
                  </span>
                </div>
              </div>

              {roomLabelOf(selectedSession) && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs sm:self-center">
                  <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span>{roomLabelOf(selectedSession)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedSession.description && (
              <div className="space-y-1.5">
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </h5>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedSession.description}
                </p>
              </div>
            )}

            {/* Speaker Spotlight */}
            {selectedSession.speakers.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Speaker{selectedSession.speakers.length > 1 ? "s" : ""}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedSession.speakers.map((speaker, idx) => (
                    <div
                      key={speaker.id || `${selectedSession.id}-modal-spk-${idx}`}
                      className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10 rounded-xl border border-orange-500/30 shrink-0">
                        <AvatarImage src={speaker.avatar || undefined} />
                        <AvatarFallback className="rounded-xl bg-primary/20 text-primary font-bold text-xs">
                          {speaker.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <h6 className="text-xs font-bold text-foreground truncate">
                          {speaker.socialUrl ? (
                            <a
                              href={speaker.socialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <span>{speaker.name}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                            </a>
                          ) : (
                            speaker.name
                          )}
                        </h6>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {speaker.role || "Presenter"}
                        </p>
                        {speaker.company && (
                          <p className="text-[10px] text-muted-foreground/75 truncate flex items-center gap-1 mt-0.5">
                            <Building className="h-2.5 w-2.5 text-orange-400" />
                            <span>{speaker.company}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <Button
                type="button"
                variant={savedSessionIds.includes(selectedSession.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleBookmark(selectedSession.id)}
                className={cn(
                  "cursor-pointer text-xs font-medium h-8.5",
                  savedSessionIds.includes(selectedSession.id)
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : ""
                )}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5 mr-1.5",
                    savedSessionIds.includes(selectedSession.id) ? "fill-white text-white" : ""
                  )}
                />
                {savedSessionIds.includes(selectedSession.id)
                  ? "Saved in Itinerary"
                  : "Save to Itinerary"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8.5 text-xs font-medium cursor-pointer flex-1 sm:flex-none"
                >
                  <a
                    href={generateGoogleCalendarUrl(selectedSession)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CalendarPlus className="h-3 w-3 mr-1 text-orange-400" />
                    Google Calendar
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadIcsFile(
                      [selectedSession],
                      `${selectedSession.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.ics`
                    )
                  }
                  className="h-8.5 text-xs font-medium cursor-pointer flex-1 sm:flex-none"
                >
                  <Download className="h-3 w-3 mr-1 text-orange-400" />
                  .ICS
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";
