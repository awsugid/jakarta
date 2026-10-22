"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  CalendarPlus,
  Clock,
  MapPin,
  Search,
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
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  // Exactly 2 View Modes: 'grid' (Calendar Matrix) vs 'list' (Detailed Timeline)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter States
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  // Inline Expandable Details: Map of sessionId -> boolean (No modal dialog!)
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Bookmarks (Saved Sessions)
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

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

  // Toggle inline detail expansion
  const toggleExpand = useCallback((sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  }, []);

  // Clear all bookmarks
  const clearAllBookmarks = useCallback(() => {
    setSavedSessionIds([]);
    setOnlySaved(false);
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

  // Extract distinct stages/rooms
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

  // Filtered Sessions according to active stage, format, search, and bookmarks
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      // Saved filter
      if (onlySaved && !savedSessionIds.includes(sess.id)) {
        return false;
      }

      // Room filter
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
  }, [sessions, onlySaved, savedSessionIds, selectedRoom, selectedFormat, searchQuery]);

  // Group filtered sessions into chronological time slots for Matrix view
  const timeSlots = useMemo(() => {
    return groupSessionsIntoTimeSlots(filteredSessions);
  }, [filteredSessions]);

  // Saved sessions for bulk export
  const savedSessions = useMemo(() => {
    return sessions.filter((s) => savedSessionIds.includes(s.id));
  }, [sessions, savedSessionIds]);

  const hasActiveFilters =
    selectedRoom !== "ALL" ||
    selectedFormat !== "ALL" ||
    searchQuery.trim().length > 0 ||
    onlySaved;

  const resetFilters = useCallback(() => {
    setSelectedRoom("ALL");
    setSelectedFormat("ALL");
    setSearchQuery("");
    setOnlySaved(false);
  }, []);

  return (
    <div className={cn("space-y-5", className)}>
      {/* 2-MODE SELECTOR & COMPACT CONTROLS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 text-xs">
        {/* Left: 2 View Modes (Grid vs Detailed List) */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
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
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === "list"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "list"}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>

        {/* Center: Track Filter Pills & Saved Shortcut */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedRoom("ALL");
              setOnlySaved(false);
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer",
              selectedRoom === "ALL" && !onlySaved
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
              onClick={() => {
                setSelectedRoom(room);
                setOnlySaved(false);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer",
                selectedRoom === room && !onlySaved
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

          {/* Saved / Starred Shortcut Pill */}
          <button
            type="button"
            onClick={() => setOnlySaved((prev) => !prev)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer border",
              onlySaved
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
            )}
            title="Filter to bookmarked talks"
          >
            <Star
              className={cn(
                "h-3 w-3",
                savedSessionIds.length > 0 || onlySaved ? "fill-amber-400 text-amber-400" : ""
              )}
            />
            <span>Saved</span>
            {savedSessionIds.length > 0 && (
              <span className="text-[10px] font-bold opacity-80">({savedSessionIds.length})</span>
            )}
          </button>
        </div>

        {/* Right: Search & Export */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-44">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search talks..."
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

          <button
            type="button"
            onClick={() =>
              downloadIcsFile(
                onlySaved && savedSessions.length > 0 ? savedSessions : sessions,
                onlySaved
                  ? "AWS-Community-Day-2026-My-Schedule.ics"
                  : "AWS-Community-Day-2026-Agenda.ics"
              )
            }
            className="h-7.5 px-2.5 rounded-lg border border-border/60 bg-background/40 hover:bg-background text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            title="Export schedule to calendar (.ics)"
          >
            <Download className="h-3.5 w-3.5 text-orange-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* FILTER ACTIVE STATUS */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{filteredSessions.length}</strong> of{" "}
            {sessions.length} talks {onlySaved && "• Filtered by saved"}
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
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/60 bg-card/20 rounded-2xl space-y-2">
          <Calendar className="h-6 w-6 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">No sessions found</h4>
          <p className="text-xs text-muted-foreground">
            {onlySaved
              ? "You haven't bookmarked any sessions yet. Click the star icon on any talk to save it."
              : "Try adjusting your search query or filters."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-orange-400 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* ============================================================ */}
          {/* MODE 1: CALENDAR GRID (Matrix with In-Place Detail Expansion) */}
          {/* ============================================================ */}
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
                      /* Plenary / Hero Banner Strip */
                      <div className="space-y-2">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);
                          const isExpanded = expandedSessionIds[session.id] || false;

                          return (
                            <div
                              key={session.id}
                              className={cn(
                                "group rounded-xl border transition-all shadow-2xs overflow-hidden",
                                session.isServiceSession
                                  ? "bg-card/40 border-border/60 hover:border-emerald-500/30"
                                  : "bg-card/50 border-border/60 hover:border-orange-500/40",
                                isExpanded && "border-orange-500/50 bg-card/80 shadow-md"
                              )}
                            >
                              {/* Clickable Header Row */}
                              <div
                                onClick={() => toggleExpand(session.id)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 cursor-pointer"
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

                                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                  {session.speakers.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5 rounded-full border border-orange-500/30">
                                        <AvatarImage
                                          src={session.speakers[0].avatar || undefined}
                                        />
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

                                  <div className="text-muted-foreground group-hover:text-foreground transition-transform">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* INLINE EXPANDED DETAIL VIEW (No Modal!) */}
                              {isExpanded && (
                                <SessionDetailInline
                                  session={session}
                                  isBookmarked={isBookmarked}
                                  onToggleBookmark={(e) => toggleBookmark(session.id, e)}
                                  onCollapse={() => toggleExpand(session.id)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Parallel Breakout Tracks */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);
                          const isExpanded = expandedSessionIds[session.id] || false;
                          const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                          return (
                            <div
                              key={session.id}
                              className={cn(
                                "group rounded-xl border border-border/60 bg-card/40 transition-all shadow-2xs overflow-hidden flex flex-col justify-between",
                                isExpanded
                                  ? "border-orange-500/50 bg-card/80 shadow-md col-span-1 md:col-span-2"
                                  : "hover:bg-card/80 hover:border-orange-500/40"
                              )}
                            >
                              {/* Clickable Card Header */}
                              <div
                                onClick={() => toggleExpand(session.id)}
                                className="p-3.5 cursor-pointer space-y-2"
                              >
                                {/* Top Meta Row */}
                                <div className="flex items-center justify-between gap-2">
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

                                  <div className="flex items-center gap-1.5">
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

                                    <div className="text-muted-foreground group-hover:text-foreground">
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-orange-400 transition-colors leading-snug">
                                  {session.title}
                                </h4>

                                {/* Speaker & Duration (Collapsed state) */}
                                {!isExpanded && (
                                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-xs">
                                    {session.speakers.length > 0 ? (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Avatar className="h-5 w-5 rounded-full border border-orange-500/30 shrink-0">
                                          <AvatarImage
                                            src={session.speakers[0].avatar || undefined}
                                          />
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
                                )}
                              </div>

                              {/* INLINE EXPANDED DETAIL VIEW (No Modal!) */}
                              {isExpanded && (
                                <SessionDetailInline
                                  session={session}
                                  isBookmarked={isBookmarked}
                                  onToggleBookmark={(e) => toggleBookmark(session.id, e)}
                                  onCollapse={() => toggleExpand(session.id)}
                                />
                              )}
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

          {/* ============================================================ */}
          {/* MODE 2: DETAILED LIST VIEW (Timeline Rail with Rich Details) */}
          {/* ============================================================ */}
          {viewMode === "list" && (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-border/60">
              {filteredSessions.map((session) => {
                const isBookmarked = savedSessionIds.includes(session.id);
                const isExpanded = expandedSessionIds[session.id] || false;
                const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                return (
                  <div key={session.id} className="relative pl-7">
                    {/* Timeline Rail Dot */}
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

                    <div
                      className={cn(
                        "rounded-xl border border-border/60 bg-card/40 transition-all overflow-hidden",
                        isExpanded
                          ? "border-orange-500/50 bg-card/80 shadow-md"
                          : "hover:bg-card/70 hover:border-orange-500/40"
                      )}
                    >
                      {/* Clickable Header Row */}
                      <div
                        onClick={() => toggleExpand(session.id)}
                        className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
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
                          <h4 className="text-base font-semibold text-foreground group-hover:text-orange-400 transition-colors">
                            {session.title}
                          </h4>

                          {/* Speaker Line (Collapsed) */}
                          {!isExpanded && session.speakers.length > 0 && (
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

                        {/* Right Actions */}
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

                          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* INLINE EXPANDED DETAIL VIEW (No Modal!) */}
                      {isExpanded && (
                        <SessionDetailInline
                          session={session}
                          isBookmarked={isBookmarked}
                          onToggleBookmark={(e) => toggleBookmark(session.id, e)}
                          onCollapse={() => toggleExpand(session.id)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// INLINE DETAIL COMPONENT (Replaces the popup modal with in-place expansion)
// =========================================================================
interface SessionDetailInlineProps {
  session: DisplayScheduleSession;
  isBookmarked: boolean;
  onToggleBookmark: (e: React.MouseEvent) => void;
  onCollapse: () => void;
}

function SessionDetailInline({
  session,
  isBookmarked,
  onToggleBookmark,
  onCollapse,
}: SessionDetailInlineProps) {
  const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

  return (
    <div className="p-4 pt-2 border-t border-border/50 bg-background/50 space-y-4 text-xs animate-in fade-in-50 duration-200">
      {/* Date, Time & Venue Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40 text-[11px]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <Calendar className="h-3.5 w-3.5 text-orange-400" />
            <span>{formatDateLabel(session.startsAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
            <Clock className="h-3.5 w-3.5 text-orange-400" />
            <span>{formatTime(session.startsAt, session.endsAt)} (Asia/Jakarta)</span>
          </div>

          {durationMin && (
            <span className="text-muted-foreground/70">• {formatDuration(durationMin)}</span>
          )}
        </div>

        {roomLabelOf(session) && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span>{roomLabelOf(session)}</span>
          </div>
        )}
      </div>

      {/* Abstract / Description */}
      {session.description && (
        <div className="space-y-1">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overview
          </h5>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {session.description}
          </p>
        </div>
      )}

      {/* Metadata Tags (Language, Level, Format) */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {session.languages.map((lang) => (
          <span
            key={lang}
            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40 font-medium flex items-center gap-1"
          >
            <Globe className="h-2.5 w-2.5 text-orange-400" />
            <span>{lang}</span>
          </span>
        ))}

        {session.levels.map((lvl) => (
          <span
            key={lvl}
            className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium flex items-center gap-1"
          >
            <Gauge className="h-2.5 w-2.5 text-purple-400" />
            <span>{lvl}</span>
          </span>
        ))}
      </div>

      {/* Speaker Spotlight Section */}
      {session.speakers.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Speaker{session.speakers.length > 1 ? "s" : ""}
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {session.speakers.map((speaker, idx) => (
              <div
                key={speaker.id || `${session.id}-spk-${idx}`}
                className="p-3 rounded-xl bg-card border border-border/50 flex items-center gap-3"
              >
                <Avatar className="h-9 w-9 rounded-xl border border-orange-500/30 shrink-0">
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

      {/* Action Toolbar inside inline detail */}
      <div className="pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={onToggleBookmark}
            className={cn(
              "cursor-pointer text-xs font-medium h-8",
              isBookmarked ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
            )}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5 mr-1.5",
                isBookmarked ? "fill-white text-white" : ""
              )}
            />
            {isBookmarked ? "Saved in Itinerary" : "Save Talk"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <a
              href={generateGoogleCalendarUrl(session)}
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
                [session],
                `${session.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.ics`
              )
            }
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <Download className="h-3 w-3 mr-1 text-orange-400" />
            .ICS
          </Button>
        </div>

        <button
          type="button"
          onClick={onCollapse}
          className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer ml-auto"
        >
          <span>Hide details</span>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";
