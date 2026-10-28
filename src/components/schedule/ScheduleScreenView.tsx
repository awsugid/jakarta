"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutGrid,
  ListFilter,
  Search,
  Maximize,
  Minimize,
  Radio,
  Clock,
  Sparkles,
  Target,
  X,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublicSchedule } from "@/lib/api";
import type { EventScheduleItem } from "@/lib/types";
import {
  mapEventItemsToDisplaySessions,
  resolveActiveSession,
  formatWibClock,
  filterSessionsByRoom,
} from "./schedule-stage-helpers";
import {
  roomLabelOf,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import { ScheduleActiveEventBar } from "./ScheduleActiveEventBar";
import { ScheduleFullscreenBoard } from "./ScheduleFullscreenBoard";
import { ScheduleFullscreenList } from "./ScheduleFullscreenList";
import { ScheduleSessionDetailModal } from "./ScheduleSessionDetailModal";
import { cn } from "@/lib/utils";

interface ScheduleScreenViewProps {
  initialSchedule?: EventScheduleItem[];
  initialKiosk?: boolean;
  initialRoom?: string;
  initialDemoTime?: string;
}

export function ScheduleScreenView({
  initialSchedule,
  initialKiosk = false,
  initialRoom = "ALL",
  initialDemoTime,
}: ScheduleScreenViewProps) {
  // Helper to read query parameters safely on the client
  const getQueryParam = (name: string, fallback: string | undefined = undefined): string | undefined => {
    if (typeof window !== "undefined") {
      const val = new URLSearchParams(window.location.search).get(name);
      if (val !== null && val !== "") return val;
    }
    return fallback;
  };

  // 1. Data Layer: loaded directly from the API endpoint
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>(() =>
    initialSchedule && initialSchedule.length > 0
      ? mapEventItemsToDisplaySessions(initialSchedule)
      : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialSchedule || initialSchedule.length === 0);

  // 2. View Mode (board vs list)
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // 3. Room filter
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    return getQueryParam("room", initialRoom) || "ALL";
  });

  // 4. Search Query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 5. Time state (live clock vs simulated override)
  const [simulatedMinutes, setSimulatedMinutes] = useState<number | null>(() => {
    const rawDemo = getQueryParam("demoTime", initialDemoTime);
    if (rawDemo) {
      if (rawDemo === "live" || rawDemo === "false") return null;
      const match = rawDemo.match(/^(\d{1,2}):(\d{2})$/);
      if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return null;
  });

  const [currentClock, setCurrentClock] = useState<Date>(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modal & focus states
  const [selectedSessionModal, setSelectedSessionModal] = useState<DisplayScheduleSession | null>(null);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);

  // 1-second live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch confirmed schedule directly from backend API
  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      try {
        const data = await fetchPublicSchedule("community-day-2026");
        if (!cancelled && Array.isArray(data?.schedule) && data.schedule.length > 0) {
          setSessions(mapEventItemsToDisplaySessions(data.schedule));
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // Fallback to direct URL if needed
        try {
          const res = await fetch("https://api.awscommunity.id/api/events/community-day-2026/schedule");
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && Array.isArray(data?.schedule) && data.schedule.length > 0) {
              setSessions(mapEventItemsToDisplaySessions(data.schedule));
              setIsLoading(false);
              return;
            }
          }
        } catch (fallbackErr) {
          console.warn("Failed to load schedule from endpoint:", fallbackErr);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSchedule();
    const interval = setInterval(loadSchedule, 60_000); // 60s background poll
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Compute effective evaluation date
  const effectiveDate = useMemo<Date>(() => {
    // 1. Manual slider / quick jump override (e.g. via ?demoTime=HH:mm)
    if (simulatedMinutes !== null) {
      const h = Math.floor(simulatedMinutes / 60).toString().padStart(2, "0");
      const m = Math.floor(simulatedMinutes % 60).toString().padStart(2, "0");
      return new Date(`2026-10-31T${h}:${m}:00+07:00`);
    }

    // 2. Production live mode: uses current real-time clock
    return currentClock;
  }, [simulatedMinutes, currentClock]);

  // Fullscreen toggle helper
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Sync fullscreen state and document classes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (active) {
        document.documentElement.classList.add("fullscreen-mode");
        document.body.classList.add("fullscreen-mode");
      } else {
        document.documentElement.classList.remove("fullscreen-mode");
        document.body.classList.remove("fullscreen-mode");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard Shortcuts: F = Fullscreen, B = Board, L = List, ESC = Clear Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setViewMode("board");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setViewMode("list");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  // Resolve active, upcoming, and phase
  const {
    activeSessions,
    currentSession,
    upcomingSession,
    isPreEvent,
    isPostEvent,
  } = useMemo(() => {
    return resolveActiveSession(sessions, effectiveDate, selectedRoom);
  }, [sessions, effectiveDate, selectedRoom]);

  // Distinct room choices for filter buttons
  const distinctRooms = useMemo<string[]>(() => {
    const roomSet = new Set<string>();
    for (const s of sessions) {
      const r = s.rooms?.[0] || s.room;
      if (r) roomSet.add(r.trim() === "800" ? "Room 800" : r.trim());
    }
    return Array.from(roomSet).sort();
  }, [sessions]);

  // Filtered sessions by Room and Search
  const filteredSessions = useMemo(() => {
    let result = filterSessionsByRoom(sessions, selectedRoom);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const inTitle = s.title.toLowerCase().includes(q);
        const inDesc = (s.description || "").toLowerCase().includes(q);
        const inSpeaker = s.speakers.some((sp) => sp.name.toLowerCase().includes(q));
        const inRoom = (roomLabelOf(s) || "").toLowerCase().includes(q);
        const inTrack = (s.track || "").toLowerCase().includes(q);
        return inTitle || inDesc || inSpeaker || inRoom || inTrack;
      });
    }

    return result;
  }, [sessions, selectedRoom, searchQuery]);

  // Handler when user clicks an active session in the hero bar
  const handleFocusSession = useCallback((session: DisplayScheduleSession) => {
    setFocusedSessionId(session.id);
    setSelectedSessionModal(session);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0b0d14] text-white select-none">
      {/* =========================================================================
          TOP NAVIGATION & CONTROL HEADER
          ========================================================================= */}
      <header className="z-40 w-full bg-[#121520]/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Brand & Live Clock */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2.5 text-white hover:text-orange-400 transition-colors group"
            title="Return to Home"
          >
            {/* Monas Hexagon Logo */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-600/20 border border-white/15 flex items-center justify-center shrink-0 group-hover:border-orange-500/50 transition-colors">
              <svg viewBox="0 0 100 100" className="w-5 h-5 text-orange-400 fill-current">
                <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="currentColor" strokeWidth="6" />
                <path d="M46 32 L54 32 L52 70 L48 70 Z" fill="currentColor" />
                <path d="M40 70 L60 70 L63 76 L37 76 Z" fill="currentColor" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-sm sm:text-base tracking-tight block text-white leading-tight">
                AWS Community Day
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 block">
                Jakarta 2026
              </span>
            </div>
          </a>

          {/* Live Clock Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
              {formatWibClock(effectiveDate)} <span className="text-[10px] text-slate-400 font-normal">WIB</span>
            </span>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="relative flex-1 max-w-xs md:max-w-md hidden md:block">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions, speakers, rooms..."
            className="pl-9 pr-8 h-8.5 text-xs bg-white/[0.06] border-white/15 text-white placeholder:text-slate-400 focus:border-orange-500/60 rounded-xl"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: View Mode Toggle & Room Filters & Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Room Filter Dropdown/Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setSelectedRoom("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                selectedRoom === "ALL"
                  ? "bg-white text-black shadow-xs font-bold"
                  : "text-slate-300 hover:text-white"
              )}
            >
              All Tracks
            </button>
            {distinctRooms.map((rm) => (
              <button
                key={rm}
                type="button"
                onClick={() => setSelectedRoom(rm)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  selectedRoom === rm
                    ? "bg-white text-black shadow-xs font-bold"
                    : "text-slate-300 hover:text-white"
                )}
              >
                {rm}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.06] border border-white/15">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "board"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8.5 px-2.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 text-orange-400" />
            ) : (
              <Maximize className="w-4 h-4 text-orange-400" />
            )}
          </Button>
        </div>
      </header>

      {/* =========================================================================
          HAPPENING NOW / CURRENT ACTIVE EVENT BAR
          ========================================================================= */}
      <ScheduleActiveEventBar
        activeSessions={activeSessions}
        primaryActiveSession={currentSession}
        upcomingSession={upcomingSession}
        isPreEvent={isPreEvent}
        isPostEvent={isPostEvent}
        currentClock={effectiveDate}
        onFocusSession={handleFocusSession}
      />

      {/* =========================================================================
          MAIN SCHEDULE CANVAS (FULL SCREEN 1-PAGE VIEW)
          ========================================================================= */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full h-full overflow-hidden">
        {isLoading && sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium animate-pulse">
              Loading AWS Community Day Schedule...
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-500" />
            <h3 className="text-lg font-bold text-white">No sessions match your filter</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              Try clearing your search keyword or switching to &ldquo;All Tracks&rdquo;.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRoom("ALL");
                setSearchQuery("");
              }}
              className="mt-2 text-xs border-white/20 text-white cursor-pointer"
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === "board" ? (
          <ScheduleFullscreenBoard
            sessions={sessions}
            filteredSessions={filteredSessions}
            activeSessions={activeSessions}
            selectedRoom={selectedRoom}
            currentClock={effectiveDate}
            onSelectSession={(s) => setSelectedSessionModal(s)}
            focusedSessionId={focusedSessionId}
          />
        ) : (
          <ScheduleFullscreenList
            sessions={filteredSessions}
            activeSessions={activeSessions}
            currentClock={effectiveDate}
            onSelectSession={(s) => setSelectedSessionModal(s)}
            focusedSessionId={focusedSessionId}
          />
        )}
      </main>

      {/* =========================================================================
          SESSION DETAIL MODAL POPUP
          ========================================================================= */}
      {selectedSessionModal && (
        <ScheduleSessionDetailModal
          session={selectedSessionModal}
          onClose={() => setSelectedSessionModal(null)}
          isActiveNow={activeSessions.some((s) => s.id === selectedSessionModal.id)}
        />
      )}
    </div>
  );
}
