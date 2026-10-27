"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
import type { EventScheduleItem } from "@/lib/types";
import {
  mapEventItemsToDisplaySessions,
  resolveActiveSession,
  parseDemoTimeToDate,
  filterSessionsByRoom,
} from "./schedule-stage-helpers";
import { StageMonasLogo } from "./StageMonasLogo";
import { StageTalkBanner } from "./StageTalkBanner";
import { StageServiceBanner } from "./StageServiceBanner";
import { StageStandbyBanner } from "./StageStandbyBanner";
import { StageOperatorBar } from "./StageOperatorBar";
import { fetchPublicSchedule } from "@/lib/api";

interface ScheduleStageViewProps {
  initialSchedule?: EventScheduleItem[];
  initialKiosk?: boolean;
  initialRoom?: string;
  initialDemoTime?: string;
}

export function ScheduleStageView({
  initialSchedule,
  initialKiosk = false,
  initialRoom = "ALL",
  initialDemoTime,
}: ScheduleStageViewProps) {
  // Helper to read query params on client side
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

  // 2. Room filter state (reads URL param if present, defaults to initialRoom or ALL)
  const [selectedRoom, setSelectedRoom] = useState<string>(() => {
    return getQueryParam("room", initialRoom) || "ALL";
  });

  // 3. Time state (live clock by default, or demoTime if provided via query param)
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
  const [isTouring, setIsTouring] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState<boolean>(() => {
    const rawKiosk = getQueryParam("kiosk", initialKiosk ? "true" : undefined);
    return rawKiosk === "true";
  });

  // Floating operator bar is only available in DEV mode or explicitly via ?dev=true
  const isDevMode = useMemo(() => {
    if (typeof window === "undefined") {
      return Boolean(import.meta.env.DEV);
    }
    return Boolean(import.meta.env.DEV || new URLSearchParams(window.location.search).get("dev") === "true");
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

  // Fetch schedule directly using centralized API client
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
        // Fallback directly to api.awscommunity.id if needed
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
    const interval = setInterval(loadSchedule, 60_000); // Poll every minute
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Live 1-second clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
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

  // Resolve active, upcoming, and phase
  const { currentSession, upcomingSession, nextSessions, isPreEvent } = useMemo(() => {
    return resolveActiveSession(sessions, effectiveDate, selectedRoom);
  }, [sessions, effectiveDate, selectedRoom]);

  // Distinct room choices for operator dropdown
  const distinctRooms = useMemo<string[]>(() => {
    const roomSet = new Set<string>();
    for (const s of sessions) {
      if (s.room) roomSet.add(s.room);
      if (s.rooms) s.rooms.forEach((r) => roomSet.add(r));
    }
    return Array.from(roomSet).sort();
  }, [sessions]);

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

  // Keyboard Shortcuts: F = Fullscreen, H = Hide controls, L = Live time
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setControlsHidden((prev) => !prev);
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setSimulatedMinutes(null);
      } else if (e.key === "ArrowLeft") {
        stepSession(-1);
      } else if (e.key === "ArrowRight") {
        stepSession(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessions, selectedRoom, effectiveDate]);

  const stepSession = (direction: -1 | 1) => {
    const filtered = filterSessionsByRoom(sessions, selectedRoom)
      .filter((s) => s.startsAt)
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());

    const nowMs = effectiveDate.getTime();
    const currIdx = filtered.findIndex((s) => {
      const st = new Date(s.startsAt!).getTime();
      const en = new Date(s.endsAt!).getTime();
      return nowMs >= st && nowMs < en;
    });

    let nextIdx = 0;
    if (currIdx !== -1) {
      nextIdx = Math.max(0, Math.min(filtered.length - 1, currIdx + direction));
    } else if (direction === 1) {
      nextIdx = filtered.findIndex((s) => new Date(s.startsAt!).getTime() > nowMs);
      if (nextIdx === -1) nextIdx = 0;
    }

    const s = filtered[nextIdx];
    if (s?.startsAt) {
      const d = new Date(s.startsAt);
      setSimulatedMinutes(d.getHours() * 60 + d.getMinutes() + 2);
    }
  };

  // Tour Mode: Auto cycle through sessions every 8 seconds
  useEffect(() => {
    if (!isTouring) return;
    const interval = setInterval(() => {
      stepSession(1);
    }, 8000);
    return () => clearInterval(interval);
  }, [isTouring, sessions, selectedRoom, effectiveDate]);

  const handleQuickJump = (timeStr: string) => {
    const parsed = parseDemoTimeToDate(timeStr);
    if (parsed) {
      setSimulatedMinutes(parsed.getHours() * 60 + parsed.getMinutes() + 1);
    }
  };

  // Synchronize URL query params quietly
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedRoom && selectedRoom !== "ALL") {
      url.searchParams.set("room", selectedRoom);
    } else {
      url.searchParams.delete("room");
    }
    if (simulatedMinutes !== null) {
      const h = Math.floor(simulatedMinutes / 60).toString().padStart(2, "0");
      const m = Math.floor(simulatedMinutes % 60).toString().padStart(2, "0");
      url.searchParams.set("demoTime", `${h}:${m}`);
    } else {
      url.searchParams.delete("demoTime");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedRoom, simulatedMinutes]);

  const currentMinutes = useMemo(() => {
    if (simulatedMinutes !== null) return simulatedMinutes;
    return effectiveDate.getHours() * 60 + effectiveDate.getMinutes();
  }, [simulatedMinutes, effectiveDate]);

  return (
    <div
      data-kiosk={initialKiosk}
      className="relative w-full h-full min-h-[640px] flex flex-col items-center justify-center bg-[#161128]"
    >
      {/* 16:9 Aspect Video Stage Framing */}
      <div className="w-full max-w-[1920px] aspect-video max-h-[1080px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
        {isLoading && sessions.length === 0 ? (
          <div className="relative w-full h-full min-h-[640px] flex flex-col items-center justify-center p-8 bg-[#161128] text-white">
            <StageMonasLogo />
            <div className="mt-8 flex items-center gap-3 text-slate-300">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <span className="text-lg font-medium tracking-wide">Loading Community Day 2026 Schedule...</span>
            </div>
          </div>
        ) : currentSession ? (
          currentSession.isServiceSession ? (
            <StageServiceBanner
              session={currentSession}
              nextSessions={nextSessions}
              currentTime={effectiveDate}
            />
          ) : (
            <StageTalkBanner
              session={currentSession}
              upcomingSession={upcomingSession}
            />
          )
        ) : (
          <StageStandbyBanner
            isPreEvent={isPreEvent}
            upcomingSession={upcomingSession}
          />
        )}
      </div>

      {/* Floating Operator Bar - Dev only or via ?dev=true */}
      {isDevMode && (
        <StageOperatorBar
          currentClock={effectiveDate}
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
          distinctRooms={distinctRooms}
          isLive={simulatedMinutes === null}
          onSnapToLive={() => setSimulatedMinutes(null)}
          minutesOfDay={currentMinutes}
          onScrubMinutes={setSimulatedMinutes}
          isTouring={isTouring}
          onToggleTour={() => setIsTouring((p) => !p)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onPrevSession={() => stepSession(-1)}
          onNextSession={() => stepSession(1)}
          onQuickJump={handleQuickJump}
          hidden={controlsHidden}
          onToggleHidden={() => setControlsHidden((p) => !p)}
        />
      )}
    </div>
  );
}
