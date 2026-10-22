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
  Check,
  LayoutGrid,
  ListFilter,
  ChevronDown,
  ChevronUp,
  Building,
  AlertCircle,
  Loader2,
  X,
  Trash2,
  ArrowRight,
  Bookmark,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
      // Ignore localStorage read errors
    }
  }, []);

  // Toggle bookmark helper
  const toggleBookmark = useCallback((sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSavedSessionIds((prev) => {
      const exists = prev.includes(sessionId);
      const next = exists ? prev.filter((id) => id !== sessionId) : [...prev, sessionId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore localStorage write errors
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
        if (!savedSessionIds.includes(sess.id)) {
          return false;
        }
      }

      // Room filter — all-rooms sessions appear under every stage
      if (selectedRoom !== "ALL") {
        const target = selectedRoom.toLowerCase();
        const inRooms =
          sess.rooms.some((r) => r.toLowerCase() === target) ||
          (!sess.rooms.length && (sess.room || "").toLowerCase() === target);
        if (!sess.allRooms && !inRooms) {
          return false;
        }
      }

      // Format filter
      if (selectedFormat !== "ALL") {
        if (selectedFormat === "Service" && !sess.isServiceSession) {
          return false;
        }
        if (selectedFormat !== "Service" && sess.sessionType !== selectedFormat) {
          return false;
        }
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
        if (!inTitle && !inDesc && !inSpeaker && !inRoom) {
          return false;
        }
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

  const hasActiveFilters = selectedRoom !== "ALL" || selectedFormat !== "ALL" || searchQuery.trim().length > 0;

  const resetFilters = useCallback(() => {
    setSelectedRoom("ALL");
    setSelectedFormat("ALL");
    setSearchQuery("");
  }, []);

  return (
    <div className={cn("space-y-8", className)}>
      {/* Top View Mode & Action Switcher Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2.5 sm:p-3 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/80 shadow-xl">
        {/* View Mode Buttons (Segmented Switcher) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 self-start sm:self-auto overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer",
              viewMode === "grid"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Calendar Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer",
              viewMode === "timeline"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            aria-pressed={viewMode === "timeline"}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Timeline Rail</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("my-schedule")}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer relative",
              viewMode === "my-schedule"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            aria-pressed={viewMode === "my-schedule"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                savedSessionIds.length > 0 && viewMode !== "my-schedule" ? "text-amber-400 fill-amber-400" : ""
              )}
            />
            <span>My Itinerary</span>
            {savedSessionIds.length > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  viewMode === "my-schedule"
                    ? "bg-white/20 text-white"
                    : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                )}
              >
                {savedSessionIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Export & Search Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Quick Export Button */}
          {viewMode === "my-schedule" && savedSessions.length > 0 ? (
            <Button
              size="sm"
              onClick={() =>
                downloadIcsFile(savedSessions, "AWS-Community-Day-2026-My-Schedule.ics")
              }
              className="h-9 px-3.5 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export My Calendar (.ics)</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadIcsFile(sessions, "AWS-Community-Day-2026-Full-Agenda.ics")
              }
              className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground border-border/80 bg-background/50 hover:bg-background cursor-pointer flex items-center gap-1.5"
              title="Download entire confirmed agenda as standard .ics iCalendar file"
            >
              <CalendarPlus className="h-3.5 w-3.5 text-orange-400" />
              <span className="hidden sm:inline">Export Full Agenda</span>
              <span className="sm:hidden">Export .ICS</span>
            </Button>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search topic, speaker, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9 text-xs bg-background/80 border-border/80 focus:border-orange-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Row: Stages & Formats */}
      {viewMode !== "my-schedule" && (
        <div className="space-y-3">
          {/* Stage Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedRoom("ALL")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                selectedRoom === "ALL"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card/50 text-muted-foreground border-border/70 hover:bg-card hover:text-foreground"
              )}
            >
              All Stages & Tracks ({sessions.length})
            </button>

            {availableRooms.map((room) => {
              const count = sessions.filter(
                (s) =>
                  s.allRooms ||
                  s.rooms.some((r) => r.toLowerCase() === room.toLowerCase()) ||
                  (!s.rooms.length && (s.room || "").toLowerCase() === room.toLowerCase())
              ).length;
              return (
                <button
                  key={room}
                  type="button"
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border",
                    selectedRoom === room
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card/50 text-muted-foreground border-border/70 hover:bg-card hover:text-foreground"
                  )}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{room}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Formats Pills & Filter Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground text-[11px] font-medium mr-1">Format:</span>
              <button
                type="button"
                onClick={() => setSelectedFormat("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer",
                  selectedFormat === "ALL"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {availableFormats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer",
                    selectedFormat === fmt
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Filter Count & Reset */}
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <span>
                Showing <strong className="text-foreground">{filteredSessions.length}</strong> of{" "}
                {sessions.length} sessions
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 cursor-pointer ml-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading confirmed event agenda...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : viewMode === "my-schedule" && savedSessionIds.length === 0 ? (
        /* Empty State for My Schedule */
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/40 rounded-3xl space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
            <Star className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-xl font-extrabold text-foreground">Your Itinerary is Empty</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Build your personalized Community Day plan! Click the ⭐ star icon on any talk or
              workshop to save it here, then export it directly into your calendar.
            </p>
          </div>
          <Button
            onClick={() => setViewMode("grid")}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 cursor-pointer"
          >
            Browse Full Schedule
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Card>
      ) : filteredSessions.length === 0 ? (
        /* No sessions matched filter */
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/40 rounded-3xl space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <Calendar className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-bold text-foreground">No Sessions Found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {hasActiveFilters
              ? "No talks matched your current search filters. Try clearing or relaxing your filters."
              : "The schedule is currently being finalized. Please check back shortly!"}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="text-xs cursor-pointer"
            >
              Clear All Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Banner for My Schedule View */}
          {viewMode === "my-schedule" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-transparent border border-orange-500/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <h3 className="text-base font-extrabold text-foreground">
                    Your Personalized Itinerary
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {savedSessions.length} sessions bookmarked
                  {totalSavedDurationMinutes > 0 && ` • ~${formatDuration(totalSavedDurationMinutes)} total`}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() =>
                    downloadIcsFile(savedSessions, "AWS-Community-Day-2026-My-Schedule.ics")
                  }
                  className="flex-1 sm:flex-none h-8 text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md cursor-pointer"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download .ICS
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllBookmarks}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Remove all bookmarked sessions"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* VIEW 1: CALENDAR GRID MATRIX */}
          {viewMode === "grid" && (
            <div className="space-y-6">
              {timeSlots.map((slot) => {
                const isPlenarySlot = slot.isPlenary;
                const isSingleSession = slot.sessions.length === 1;

                return (
                  <div key={slot.slotKey} className="space-y-3">
                    {/* Time Slot Header Marker */}
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-sm shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.timeLabel}</span>
                        {slot.durationLabel && (
                          <span className="text-[10px] opacity-75 font-normal ml-0.5">
                            ({slot.durationLabel})
                          </span>
                        )}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-border/80 via-border/30 to-transparent" />
                      {isPlenarySlot && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 shrink-0">
                          Plenary Session
                        </span>
                      )}
                    </div>

                    {/* Cards Grid: Plenary full-width banner vs Breakout multi-track parallel columns */}
                    {isPlenarySlot || isSingleSession ? (
                      /* Plenary / Hero Banner Card (Spans full width across all tracks) */
                      <div className="space-y-3">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);

                          return (
                            <Card
                              key={session.id}
                              onClick={() => setSelectedSession(session)}
                              className={cn(
                                "group border rounded-3xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl",
                                session.isServiceSession
                                  ? "bg-card/60 hover:border-emerald-500/40 border-border/80"
                                  : "bg-gradient-to-br from-card/90 via-card/60 to-orange-500/5 border-orange-500/30 hover:border-orange-500/60"
                              )}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      className={cn(
                                        "text-[10px] font-semibold border shadow-sm",
                                        getFormatBadgeClass(session.sessionType)
                                      )}
                                    >
                                      {session.sessionType || (session.isServiceSession ? "Rundown" : "Keynote")}
                                    </Badge>

                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm",
                                        getRoomBadgeClass(roomLabelOf(session))
                                      )}
                                    >
                                      <MapPin className="h-3 w-3" />
                                      {roomLabelOf(session)}
                                    </span>

                                    {session.track && (
                                      <span className="text-[11px] text-muted-foreground">
                                        • {session.track}
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground group-hover:text-orange-400 transition-colors leading-snug">
                                    {session.title}
                                  </h3>

                                  {session.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-3xl leading-relaxed">
                                      {session.description}
                                    </p>
                                  )}

                                  {/* Presenter info in banner */}
                                  {session.speakers.length > 0 && (
                                    <div className="flex items-center gap-3 pt-1">
                                      <div className="flex -space-x-2 overflow-hidden">
                                        {session.speakers.map((sp) => (
                                          <Avatar
                                            key={sp.id || sp.name}
                                            className="inline-block h-7 w-7 rounded-full ring-2 ring-background border border-orange-500/30"
                                          >
                                            <AvatarImage src={sp.avatar || undefined} />
                                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                              {sp.name.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </div>
                                      <span className="text-xs font-semibold text-foreground/90 truncate">
                                        {session.speakers.map((sp) => sp.name).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Right Side Actions: Bookmark Star & View Details */}
                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleBookmark(session.id, e)}
                                    aria-label={isBookmarked ? "Remove from itinerary" : "Save to itinerary"}
                                    className={cn(
                                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
                                      isBookmarked
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                                        : "bg-muted/40 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted"
                                    )}
                                  >
                                    <Star
                                      className={cn(
                                        "h-4 w-4 transition-transform group-hover:scale-110",
                                        isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                      )}
                                    />
                                  </button>

                                  <div className="hidden sm:inline-flex items-center gap-1 text-xs text-orange-400 font-semibold group-hover:translate-x-1 transition-transform">
                                    <span>Details</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      /* Parallel Breakout Sessions: 2 or more tracks side-by-side */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {slot.sessions.map((session) => {
                          const isBookmarked = savedSessionIds.includes(session.id);
                          const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                          return (
                            <Card
                              key={session.id}
                              onClick={() => setSelectedSession(session)}
                              className="group border border-border/80 bg-card/75 backdrop-blur-xl rounded-3xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:border-orange-500/50 flex flex-col justify-between"
                            >
                              <div className="space-y-3">
                                {/* Top Badges & Bookmark */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm",
                                        getRoomBadgeClass(roomLabelOf(session))
                                      )}
                                    >
                                      <MapPin className="h-3 w-3" />
                                      {roomLabelOf(session)}
                                    </span>

                                    <Badge
                                      className={cn(
                                        "text-[10px] font-semibold border shadow-sm",
                                        getFormatBadgeClass(session.sessionType)
                                      )}
                                    >
                                      {session.sessionType || "Technical Session"}
                                    </Badge>

                                    {durationMin && (
                                      <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/40">
                                        {formatDuration(durationMin)}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => toggleBookmark(session.id, e)}
                                    aria-label={isBookmarked ? "Remove from itinerary" : "Save to itinerary"}
                                    className={cn(
                                      "h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border shrink-0",
                                      isBookmarked
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                                        : "bg-muted/40 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted"
                                    )}
                                  >
                                    <Star
                                      className={cn(
                                        "h-3.5 w-3.5 transition-transform group-hover:scale-110",
                                        isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* Talk Title */}
                                <h3 className="text-base sm:text-lg font-extrabold text-foreground group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                                  {session.title}
                                </h3>

                                {/* Abstract Snippet */}
                                {session.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {session.description}
                                  </p>
                                )}
                              </div>

                              {/* Presenter Spotlight at bottom of card */}
                              <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between gap-3">
                                {session.speakers.length > 0 ? (
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar className="h-8 w-8 rounded-full border border-orange-500/30 shrink-0">
                                      <AvatarImage src={session.speakers[0].avatar || undefined} />
                                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                                        {session.speakers[0].name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate">
                                        {session.speakers[0].name}
                                      </p>
                                      {session.speakers[0].company && (
                                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                          <Building className="h-2.5 w-2.5 text-orange-400" />
                                          <span className="truncate">{session.speakers[0].company}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">AWS Community Day</span>
                                )}

                                <span className="text-[11px] text-orange-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5 shrink-0">
                                  Details <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: DETAILED TIMELINE LIST RAIL (Also used for My Schedule) */}
          {(viewMode === "timeline" || viewMode === "my-schedule") && (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-purple-500/30 before:to-transparent">
              {filteredSessions.map((session) => {
                const isExpanded = expandedIds[session.id] || false;
                const isBookmarked = savedSessionIds.includes(session.id);
                const durationMin = getDurationMinutes(session.startsAt, session.endsAt);

                return (
                  <div key={session.id} className="relative pl-7 sm:pl-10">
                    {/* Timeline Rail Dot */}
                    <div
                      className={cn(
                        "absolute left-1.5 sm:left-2.5 top-8 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-background shadow-md transition-all",
                        session.isServiceSession
                          ? "bg-emerald-400"
                          : session.allRooms
                          ? "bg-amber-400 ring-4 ring-amber-400/20"
                          : "bg-orange-500 ring-4 ring-orange-500/20"
                      )}
                    />

                    <Card className="border-border/80 bg-card/75 backdrop-blur-xl rounded-3xl p-5 sm:p-7 shadow-xl hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden group">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                        {/* Left Column: Time & Room Details */}
                        <div className="lg:w-48 shrink-0 space-y-2.5">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-sm">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(session.startsAt, session.endsAt)}
                          </div>

                          {(roomLabelOf(session) || "") && (
                            <div>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm",
                                  getRoomBadgeClass(roomLabelOf(session))
                                )}
                              >
                                <MapPin className="h-3 w-3" />
                                {roomLabelOf(session)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold shadow-sm border",
                                getFormatBadgeClass(session.sessionType)
                              )}
                            >
                              {session.sessionType || "Technical Session"}
                            </Badge>

                            {durationMin && (
                              <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/40">
                                {formatDuration(durationMin)}
                              </span>
                            )}
                          </div>

                          {/* Quick Calendar Export Links */}
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => toggleBookmark(session.id, e)}
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                                isBookmarked
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                  : "bg-muted/40 text-muted-foreground border-border/70 hover:text-foreground"
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-3 w-3",
                                  isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                )}
                              />
                              <span>{isBookmarked ? "Saved" : "Save"}</span>
                            </button>

                            <a
                              href={generateGoogleCalendarUrl(session)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-orange-400 transition-colors p-1"
                              title="Add to Google Calendar"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              <span className="sr-only">Add to Google Calendar</span>
                            </a>
                          </div>
                        </div>

                        {/* Center Column: Session Title, Abstract & Details */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <h3
                            onClick={() => setSelectedSession(session)}
                            className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-snug group-hover:text-orange-400 transition-colors cursor-pointer"
                          >
                            {session.title}
                          </h3>

                          {session.description && (
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              <p className={isExpanded ? "" : "line-clamp-3"}>
                                {session.description}
                              </p>
                              {session.description.length > 180 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((prev) => ({
                                      ...prev,
                                      [session.id]: !isExpanded,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold mt-1.5 cursor-pointer transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp className="h-3.5 w-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      Read full abstract <ChevronDown className="h-3.5 w-3.5" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Presenter Spotlight */}
                        {session.speakers.length > 0 && (
                          <div className="lg:w-64 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/60">
                            <div className="space-y-2.5">
                              {session.speakers.map((speaker, spkIdx) => (
                                <div
                                  key={speaker.id || `${session.id}-spk-${spkIdx}`}
                                  className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-11 w-11 rounded-2xl border-2 border-orange-500/30 shadow-md shrink-0">
                                      <AvatarImage src={speaker.avatar || undefined} />
                                      <AvatarFallback className="rounded-2xl bg-primary/20 text-primary font-bold text-sm">
                                        {speaker.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-bold text-foreground truncate">
                                        {speaker.socialUrl ? (
                                          <a
                                            href={speaker.socialUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-primary transition-colors inline-flex items-center gap-1"
                                          >
                                            <span>{speaker.name}</span>
                                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                                            <span className="sr-only"> — {speaker.name}'s profile</span>
                                          </a>
                                        ) : (
                                          speaker.name
                                        )}
                                      </h4>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {speaker.role || "Presenter"}
                                      </p>
                                    </div>
                                  </div>

                                  {speaker.company && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 truncate">
                                      <Building className="h-3 w-3 shrink-0 text-orange-400" />
                                      <span className="truncate">{speaker.company}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INTERACTIVE SESSION DETAIL MODAL DIALOG */}
      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        {selectedSession && (
          <DialogContent className="max-w-2xl bg-card border-border/80 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-3 text-left">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "text-[10px] font-semibold border shadow-sm",
                    getFormatBadgeClass(selectedSession.sessionType)
                  )}
                >
                  {selectedSession.sessionType || (selectedSession.isServiceSession ? "Rundown" : "Technical Session")}
                </Badge>

                {(roomLabelOf(selectedSession) || "") && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm",
                      getRoomBadgeClass(roomLabelOf(selectedSession))
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {roomLabelOf(selectedSession)}
                  </span>
                )}

                {getDurationMinutes(selectedSession.startsAt, selectedSession.endsAt) && (
                  <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-md bg-muted/40">
                    {formatDuration(getDurationMinutes(selectedSession.startsAt, selectedSession.endsAt))}
                  </span>
                )}
              </div>

              {/* Title */}
              <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
                {selectedSession.title}
              </DialogTitle>

              <DialogDescription className="sr-only">
                Detailed view of {selectedSession.title}
              </DialogDescription>
            </DialogHeader>

            {/* Time & Venue Banner */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Calendar className="h-4 w-4 text-orange-400" />
                  <span>{formatDateLabel(selectedSession.startsAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <span>{formatTime(selectedSession.startsAt, selectedSession.endsAt)} (Asia/Jakarta)</span>
                </div>
              </div>

              {roomLabelOf(selectedSession) && (
                <div className="flex items-center gap-1.5 text-muted-foreground sm:self-center">
                  <MapPin className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="font-medium">{roomLabelOf(selectedSession)}</span>
                </div>
              )}
            </div>

            {/* Session Description / Abstract */}
            {selectedSession.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Session Overview
                </h4>
                <p className="text-sm text-muted-foreground/95 leading-relaxed whitespace-pre-line">
                  {selectedSession.description}
                </p>
              </div>
            )}

            {/* Speaker Spotlight Section */}
            {selectedSession.speakers.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Featured Speaker{selectedSession.speakers.length > 1 ? "s" : ""}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSession.speakers.map((speaker, idx) => (
                    <div
                      key={speaker.id || `${selectedSession.id}-modal-spk-${idx}`}
                      className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-3.5"
                    >
                      <Avatar className="h-12 w-12 rounded-2xl border-2 border-orange-500/30 shadow-md shrink-0">
                        <AvatarImage src={speaker.avatar || undefined} />
                        <AvatarFallback className="rounded-2xl bg-primary/20 text-primary font-bold text-sm">
                          {speaker.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-bold text-foreground truncate">
                          {speaker.socialUrl ? (
                            <a
                              href={speaker.socialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <span>{speaker.name}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>
                          ) : (
                            speaker.name
                          )}
                        </h5>
                        <p className="text-xs text-muted-foreground truncate">
                          {speaker.role || "Presenter"}
                        </p>
                        {speaker.company && (
                          <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1 mt-0.5">
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
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant={savedSessionIds.includes(selectedSession.id) ? "default" : "outline"}
                onClick={() => toggleBookmark(selectedSession.id)}
                className={cn(
                  "cursor-pointer text-xs font-semibold h-10",
                  savedSessionIds.includes(selectedSession.id)
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : ""
                )}
              >
                <Star
                  className={cn(
                    "h-4 w-4 mr-1.5",
                    savedSessionIds.includes(selectedSession.id) ? "fill-white text-white" : ""
                  )}
                />
                {savedSessionIds.includes(selectedSession.id) ? "Saved in Itinerary" : "Add to My Itinerary"}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-10 text-xs font-medium cursor-pointer flex-1 sm:flex-none"
                >
                  <a
                    href={generateGoogleCalendarUrl(selectedSession)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
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
                  className="h-10 text-xs font-medium cursor-pointer flex-1 sm:flex-none"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
                  Download .ICS
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
