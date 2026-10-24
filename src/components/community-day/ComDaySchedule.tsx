"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPublicSchedule } from "@/lib/api";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import { cn } from "@/lib/utils";
import {
  downloadIcsFile,
  roomLabelOf,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";
import {
  STORAGE_KEY,
  type ScheduleViewMode,
} from "./schedule-types";
import { ScheduleToolbar, type RoomOption } from "./ScheduleToolbar";
import { ScheduleBoardView } from "./ScheduleBoardView";
import { ScheduleListView } from "./ScheduleListView";

interface ComDayScheduleProps {
  eventSlug?: string;
  className?: string;
}

export function ComDaySchedule({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  className,
}: ComDayScheduleProps) {
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exactly 2 Modes: 'board' vs 'list'
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("board");
  const [, setUserPickedView] = useState(false);

  // Filters
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  // List View Accordion Expansion State (sessionId -> boolean)
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Bookmarks / Saved sessions
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  // Automatically switch to list mode on mobile view (< 768px), matching reference:
  // "Use the board on a big screen and the list on your phone."
  useEffect(() => {
    if (typeof window === "undefined") return;

    let wasMobile = window.innerWidth < 768;

    // Immediately enforce list mode on initial mount if on mobile device
    if (wasMobile) {
      setViewMode("list");
    }

    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        if (isMobile) {
          setViewMode("list");
          setUserPickedView(false);
        } else {
          setViewMode("board");
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Fetch confirmed public schedule from backend
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
            isServiceSession: Boolean(item.isServiceSession),
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

  // Toggle inline detail expansion in List view
  const toggleExpand = useCallback((sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  }, []);

  // Extract distinct tracks/rooms dynamically with subtitle
  const distinctRoomOptions = useMemo<RoomOption[]>(() => {
    const map = new Map<string, RoomOption>();
    sessions.forEach((s) => {
      const roomRaw = (s.rooms?.[0] || s.room || "").trim();
      if (!roomRaw) return;
      const key = roomRaw.toLowerCase();
      const displayName = roomRaw === "800" ? "Room 800" : roomRaw;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: displayName,
          track: s.track || (roomRaw.toLowerCase().includes("atrium") ? "Main Stage" : "Classroom 1"),
          count: 1,
        });
      } else {
        const existing = map.get(key)!;
        existing.count += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  // Filtered Sessions according to active track, search query, and saved toggle
  const filteredSessions = useMemo(() => {
    return sessions.filter((sess) => {
      if (onlySaved && !savedSessionIds.includes(sess.id)) {
        return false;
      }

      if (selectedRoom !== "ALL") {
        const target = selectedRoom.toLowerCase();
        const inRooms =
          sess.rooms.some((r) => {
            const rLow = r.toLowerCase();
            return rLow === target || (target.includes("800") && rLow.includes("800"));
          }) ||
          (!sess.rooms.length &&
            ((sess.room || "").toLowerCase() === target ||
              (target.includes("800") && (sess.room || "").toLowerCase().includes("800"))));
        if (!sess.allRooms && !inRooms) return false;
      }

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
        const inTrack = (sess.track || "").toLowerCase().includes(q);
        const inMeta = [...sess.languages, ...sess.levels].some((v) =>
          v.toLowerCase().includes(q)
        );
        if (!inTitle && !inDesc && !inSpeaker && !inRoom && !inTrack && !inMeta) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, onlySaved, savedSessionIds, selectedRoom, searchQuery]);

  // Saved sessions for bulk calendar export
  const savedSessions = useMemo(() => {
    return sessions.filter((s) => savedSessionIds.includes(s.id));
  }, [sessions, savedSessionIds]);

  const hasActiveFilters =
    selectedRoom !== "ALL" || searchQuery.trim().length > 0 || onlySaved;

  const resetFilters = useCallback(() => {
    setSelectedRoom("ALL");
    setSearchQuery("");
    setOnlySaved(false);
  }, []);

  return (
    <div className={cn("space-y-5", className)}>
      {/* SCOPED COMPONENT STYLES */}
      <style>{`
        /* Smooth Custom Horizontal Scrollbar */
        .schedule-scroll-area::-webkit-scrollbar {
          height: 10px;
        }
        .schedule-scroll-area::-webkit-scrollbar-track {
          background: #10121A;
          border-radius: 8px;
        }
        .schedule-scroll-area::-webkit-scrollbar-thumb {
          background: #2D3346;
          border-radius: 8px;
          border: 2px solid #10121A;
        }
        .schedule-scroll-area::-webkit-scrollbar-thumb:hover {
          background: #FF9900;
        }
        .schedule-scroll-area.is-dragging {
          cursor: grabbing !important;
          user-select: none;
        }
        
        /* 100% Solid Opaque Popover Card */
        .schedule-popover-card {
          background-color: #161922 !important;
          border: 1px solid rgba(255, 153, 0, 0.4) !important;
          box-shadow: 0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          opacity: 1 !important;
        }

        /* List View Smooth In-Place Height Transition */
        .schedule-list-detail {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .schedule-list-item.is-expanded .schedule-list-detail {
          grid-template-rows: 1fr;
        }
        .schedule-list-detail > div {
          overflow: hidden;
        }
      `}</style>

      {/* TOP CONTROLS & UNIFIED TOOLBAR */}
      <ScheduleToolbar
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setUserPickedView(true);
          setViewMode(mode);
        }}
        selectedRoom={selectedRoom}
        onRoomChange={(room) => {
          setSelectedRoom(room);
          setOnlySaved(false);
        }}
        distinctRoomOptions={distinctRoomOptions}
        onlySaved={onlySaved}
        onToggleOnlySaved={() => setOnlySaved((prev) => !prev)}
        savedCount={savedSessionIds.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDownloadIcs={() =>
          downloadIcsFile(
            onlySaved && savedSessions.length > 0 ? savedSessions : sessions,
            onlySaved
              ? "AWS-Community-Day-2026-My-Schedule.ics"
              : "AWS-Community-Day-2026-Agenda.ics"
          )
        }
        filteredCount={filteredSessions.length}
        totalCount={sessions.length}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading confirmed agenda...
          </p>
        </div>
      ) : error && sessions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-center space-y-2">
          <AlertCircle className="h-6 w-6 mx-auto" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border/80 bg-card/20 rounded-2xl space-y-3">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
          <h4 className="text-base font-bold text-foreground">No sessions match your filter</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {onlySaved
              ? "You haven't bookmarked any sessions yet. Click the star icon on any talk to save it."
              : "Try choosing another track pill or clearing your search keywords."}
          </p>
          {hasActiveFilters && (
            <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-2">
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* MODE 1: BOARD VIEW */}
          {viewMode === "board" && (
            <ScheduleBoardView
              sessions={sessions}
              filteredSessions={filteredSessions}
              savedSessionIds={savedSessionIds}
              onToggleBookmark={toggleBookmark}
              selectedRoom={selectedRoom}
            />
          )}

          {/* MODE 2: LIST VIEW */}
          {viewMode === "list" && (
            <ScheduleListView
              sessions={filteredSessions}
              savedSessionIds={savedSessionIds}
              expandedSessionIds={expandedSessionIds}
              onToggleBookmark={toggleBookmark}
              onToggleExpand={toggleExpand}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Preserve Astro React client renderer symbol
(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";
