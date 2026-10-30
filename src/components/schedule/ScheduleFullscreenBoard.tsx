"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  Sparkles,
  MapPin,
  Radio,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatTimeShort,
  parseMinutesOfDay,
  formatHourMin,
  roomLabelOf,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import {
  RULER_HEIGHT,
  LABEL_WIDTH_DESKTOP,
  LABEL_WIDTH_MOBILE,
  type LaneDefinition,
} from "@/components/community-day/schedule-types";
import { isPlenarySession, getShortSessionMeta } from "./schedule-stage-helpers";

// Only venue-wide plenary sessions legitimately spanning all track lanes across the entire canvas
const isCanvasPlenarySession = (s: DisplayScheduleSession): boolean => {
  if (s.allRooms || s.room === "All Rooms") return true;
  const title = (s.title || "").toLowerCase();
  if (title.includes("open gate")) return true;
  return false;
};

// Generous label widths so tracks like "Classroom 2" or "Classroom 3" never truncate
// Scaled up for 4K Ultra HD TV displays (3840 x 2160)
const FULLSCREEN_LABEL_WIDTH_4K = 260;
const FULLSCREEN_LABEL_WIDTH_DESKTOP = 180;
const FULLSCREEN_LABEL_WIDTH_MOBILE = 110;

interface ScheduleFullscreenBoardProps {
  sessions: DisplayScheduleSession[];
  filteredSessions: DisplayScheduleSession[];
  activeSessions: DisplayScheduleSession[];
  selectedRoom: string;
  currentClock: Date;
  onSelectSession: (session: DisplayScheduleSession) => void;
  focusedSessionId?: string | null;
}

export function ScheduleFullscreenBoard({
  sessions,
  filteredSessions,
  activeSessions,
  selectedRoom,
  currentClock,
  onSelectSession,
  focusedSessionId,
}: ScheduleFullscreenBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(4.8); // generous pixels per minute for readable titles
  const [labelWidth, setLabelWidth] = useState(FULLSCREEN_LABEL_WIDTH_DESKTOP);
  const [containerHeight, setContainerHeight] = useState(760);

  // Drag-to-pan states
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Responsive label width & container dimensions (adaptive to 4K TV screens)
  useEffect(() => {
    const handleResize = () => {
      const is4K = window.innerWidth >= 2560;
      const isMobile = window.innerWidth < 640;
      setLabelWidth(
        is4K ? FULLSCREEN_LABEL_WIDTH_4K : isMobile ? FULLSCREEN_LABEL_WIDTH_MOBILE : FULLSCREEN_LABEL_WIDTH_DESKTOP
      );
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight || window.innerHeight - 140);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute time boundaries and track lanes
  const { T0, T1, allLanes, ticks } = useMemo(() => {
    let minM = 480; // 08:00 WIB
    let maxM = 1040; // 17:20 WIB

    const startTimes = sessions
      .map((s) => parseMinutesOfDay(s.startsAt))
      .filter((m): m is number => m !== null);
    const endTimes = sessions
      .map((s) => parseMinutesOfDay(s.endsAt))
      .filter((m): m is number => m !== null);

    if (startTimes.length > 0) {
      minM = Math.floor(Math.min(...startTimes) / 30) * 30;
    }
    if (endTimes.length > 0) {
      maxM = Math.ceil(Math.max(...endTimes) / 30) * 30;
    }

    // Lane definitions
    const laneMap = new Map<string, LaneDefinition>();
    sessions.forEach((s) => {
      const roomRaw = (s.rooms?.[0] || s.room || "").trim();
      if (!roomRaw) return;
      const key = roomRaw.toLowerCase();
      if (!laneMap.has(key)) {
        const displayName = roomRaw === "800" ? "Room 800" : roomRaw;
        laneMap.set(key, {
          id: key,
          name: displayName,
          subtitle: s.track || (roomRaw.toLowerCase().includes("atrium") ? "Main Stage" : "Classroom 1"),
        });
      }
    });

    const builtLanes = Array.from(laneMap.values());
    if (builtLanes.length === 0) {
      builtLanes.push({
        id: "atrium",
        name: "Atrium",
        subtitle: "Main Stage",
      });
    }

    // Sort order: Atrium (Main Stage) -> Room 800 -> Classroom 2 -> Classroom 3
    builtLanes.sort((a, b) => {
      const aLow = a.name.toLowerCase();
      const bLow = b.name.toLowerCase();
      if (aLow.includes("atrium") || aLow.includes("main")) return -1;
      if (bLow.includes("atrium") || bLow.includes("main")) return 1;
      if (aLow.includes("800")) return -1;
      if (bLow.includes("800")) return 1;
      return a.name.localeCompare(b.name);
    });

    // 30-min ruler ticks
    const tickList: { min: number; label: string; isHalf: boolean }[] = [];
    for (let t = minM; t <= maxM; t += 30) {
      tickList.push({
        min: t,
        label: formatHourMin(t),
        isHalf: t % 60 !== 0,
      });
    }

    return {
      T0: minM,
      T1: maxM,
      allLanes: builtLanes,
      ticks: tickList,
    };
  }, [sessions]);

  // Filter visible lanes according to room selection
  const visibleLanes = useMemo(() => {
    if (selectedRoom === "ALL") return allLanes;
    const target = selectedRoom.toLowerCase();
    return allLanes.filter((l) => {
      const lName = l.name.toLowerCase();
      return lName === target || (target.includes("800") && lName.includes("800"));
    });
  }, [allLanes, selectedRoom]);

  // Dynamic lane height so schedule fills and centers on the screen with generous room for talk titles
  const laneHeight = useMemo(() => {
    const numLanes = Math.max(1, visibleLanes.length);
    const avail = containerHeight - RULER_HEIGHT - 20;
    if (avail <= 0) return 165;
    const computed = Math.floor(avail / numLanes);
    // On 4K TV displays (2160px height), lanes scale up to 480px to fill the entire TV screen vertically
    return Math.max(155, Math.min(480, computed));
  }, [containerHeight, visibleLanes.length]);

  const isLargeDisplay = laneHeight >= 260 || (typeof window !== "undefined" && window.innerWidth >= 2560);

  const timelineSpan = T1 - T0;
  const timelineWidth = timelineSpan * scale;
  const totalCanvasWidth = labelWidth + timelineWidth;
  const totalLanesHeight = visibleLanes.length * laneHeight;
  const canvasHeight = RULER_HEIGHT + totalLanesHeight;

  // Precompute layout for non-plenary sessions grouped by lane to prevent collisions
  const nonPlenaryLayoutMap = useMemo(() => {
    const laneGroups = new Map<number, DisplayScheduleSession[]>();
    const nonPlenary = filteredSessions.filter((s) => !isCanvasPlenarySession(s));

    for (const session of nonPlenary) {
      const roomRaw = (session.rooms?.[0] || session.room || "").toLowerCase();
      let laneIdx = visibleLanes.findIndex((l) => {
        const lName = l.name.toLowerCase();
        return lName === roomRaw || (roomRaw.includes("800") && lName.includes("800"));
      });
      if (laneIdx < 0) laneIdx = 0;
      if (!laneGroups.has(laneIdx)) {
        laneGroups.set(laneIdx, []);
      }
      laneGroups.get(laneIdx)!.push(session);
    }

    const layout = new Map<
      string,
      {
        laneIdx: number;
        blockLeft: number;
        blockWidth: number;
        blockTop: number;
        blockHeight: number;
        tier: number;
        isShort: boolean;
        durationMin: number;
      }
    >();

    laneGroups.forEach((laneSessions, laneIdx) => {
      laneSessions.sort((a, b) => {
        const aStart = parseMinutesOfDay(a.startsAt) ?? 0;
        const bStart = parseMinutesOfDay(b.startsAt) ?? 0;
        return aStart - bStart;
      });

      const laneTop = RULER_HEIGHT + laneIdx * laneHeight;
      const halfHeight = Math.floor((laneHeight - 16) / 2);

      // 1. Assign tiers (0 = full height, 1 = top sub-row, 2 = bottom sub-row)
      const tieredSessions = laneSessions.map((session) => {
        const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
        const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 30;
        const durationMin = Math.max(1, endMin - startMin);
        const isShort = durationMin <= 15;
        return {
          session,
          startMin,
          endMin,
          durationMin,
          isShort,
          tier: 0,
        };
      });

      let lastShortTier = 2;
      for (let i = 0; i < tieredSessions.length; i++) {
        const item = tieredSessions[i];
        if (item.isShort) {
          item.tier = lastShortTier === 1 ? 2 : 1;
          lastShortTier = item.tier;
        } else {
          item.tier = 0;
          lastShortTier = 2; // reset alternating counter for next short cluster
        }
      }

      // 2. Compute bounds for each session ensuring 0 collision
      for (let i = 0; i < tieredSessions.length; i++) {
        const item = tieredSessions[i];
        const { session, startMin, durationMin, isShort, tier } = item;
        const blockLeft = labelWidth + (startMin - T0) * scale + 2;
        const naturalWidth = Math.max(12, durationMin * scale - 4);

        let nextLimitMin: number | null = null;
        for (let j = i + 1; j < tieredSessions.length; j++) {
          const candidate = tieredSessions[j];
          // A tier 1 session is restricted by the next tier 1 or tier 0 session
          // A tier 2 session is restricted by the next tier 2 or tier 0 session
          // A tier 0 session is restricted by the next session of any tier
          if (tier === 0 || candidate.tier === 0 || candidate.tier === tier) {
            nextLimitMin = candidate.startMin;
            break;
          }
        }

        const maxAvailableWidth =
          nextLimitMin !== null && nextLimitMin > startMin
            ? (nextLimitMin - startMin) * scale - 4
            : Math.max(naturalWidth, 15 * scale - 4);

        const blockWidth = isShort
          ? Math.max(16, Math.min(maxAvailableWidth, Math.max(naturalWidth, (durationMin + 5) * scale - 4)))
          : Math.max(16, Math.min(naturalWidth, maxAvailableWidth));

        const blockTop =
          tier === 0
            ? laneTop + 6
            : tier === 1
            ? laneTop + 6
            : laneTop + 6 + halfHeight + 4;

        const blockHeight = tier === 0 ? laneHeight - 12 : halfHeight;

        layout.set(session.id, {
          laneIdx,
          blockLeft,
          blockWidth,
          blockTop,
          blockHeight,
          tier,
          isShort,
          durationMin,
        });
      }
    });

    return layout;
  }, [filteredSessions, visibleLanes, labelWidth, T0, scale, laneHeight]);

  // Precompute layout for venue-wide canvas plenary sessions spanning across all lanes
  const plenaryLayoutMap = useMemo(() => {
    const plenary = filteredSessions.filter((s) => isCanvasPlenarySession(s));
    plenary.sort((a, b) => {
      const aStart = parseMinutesOfDay(a.startsAt) ?? 0;
      const bStart = parseMinutesOfDay(b.startsAt) ?? 0;
      return aStart - bStart;
    });

    const layout = new Map<
      string,
      {
        blockLeft: number;
        blockWidth: number;
      }
    >();

    for (let i = 0; i < plenary.length; i++) {
      const session = plenary[i];
      const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
      const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 30;
      const durationMin = Math.max(1, endMin - startMin);

      const nextSession = plenary[i + 1];
      const nextStartMin = nextSession ? (parseMinutesOfDay(nextSession.startsAt) ?? null) : null;

      const blockLeft = labelWidth + (startMin - T0) * scale + 2;
      const naturalWidth = durationMin * scale - 4;
      const maxAvailableWidth =
        nextStartMin !== null && nextStartMin > startMin
          ? (nextStartMin - startMin) * scale - 4
          : naturalWidth;

      const blockWidth = Math.max(12, Math.min(naturalWidth, maxAvailableWidth));

      layout.set(session.id, {
        blockLeft,
        blockWidth,
      });
    }

    return layout;
  }, [filteredSessions, labelWidth, T0, scale]);

  // Current minute in WIB
  const currentMinutes = useMemo(() => {
    try {
      const parts = currentClock.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2], 10) / 60;
    } catch {
      return 0;
    }
  }, [currentClock]);

  // Whether "NOW" line falls within timeline viewable bounds
  const isNowInBounds = currentMinutes >= T0 && currentMinutes <= T1;
  const nowX = labelWidth + (currentMinutes - T0) * scale;

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(10.0, s * 1.25));
  const zoomOut = () => setScale((s) => Math.max(1.5, s / 1.25));
  const fitSchedule = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const avail = scrollContainerRef.current.clientWidth - labelWidth - 40;
    if (avail > 0 && timelineSpan > 0) {
      setScale(Math.max(3.6, avail / timelineSpan));
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [labelWidth, timelineSpan]);

  // Pan to current time ("NOW")
  const scrollToNow = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const targetX = nowX - scrollContainerRef.current.clientWidth / 2;
    scrollContainerRef.current.scrollTo({
      left: Math.max(0, targetX),
      behavior: "smooth",
    });
  }, [nowX]);

  // Initial fit or scroll to now (adaptive to 4K TV screens)
  useEffect(() => {
    if (isNowInBounds) {
      scrollToNow();
    } else {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
      }
      // On 4K TV / ultra-wide displays (3840 x 2160), automatically fit the 9h day perfectly to the screen
      if (typeof window !== "undefined" && window.innerWidth >= 2560 && scrollContainerRef.current) {
        const avail = scrollContainerRef.current.clientWidth - labelWidth - 40;
        if (avail > 0 && timelineSpan > 0) {
          setScale(Math.max(4.8, avail / timelineSpan));
        }
      }
    }
  }, [isNowInBounds, scrollToNow, timelineSpan, labelWidth]);

  // Handle focused session scroll
  useEffect(() => {
    if (!focusedSessionId || !scrollContainerRef.current) return;
    const session = sessions.find((s) => s.id === focusedSessionId);
    if (!session?.startsAt) return;
    const sMin = parseMinutesOfDay(session.startsAt);
    if (sMin === null) return;
    const targetX = labelWidth + (sMin - T0) * scale - scrollContainerRef.current.clientWidth / 3;
    scrollContainerRef.current.scrollTo({
      left: Math.max(0, targetX),
      behavior: "smooth",
    });
  }, [focusedSessionId, sessions, labelWidth, T0, scale]);

  // Horizontal wheel handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    } else if (e.deltaY !== 0 && e.deltaX === 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".schedule-card-btn, button, a")) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
    scrollContainerRef.current?.classList.add("is-dragging");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) {
      hasMovedRef.current = true;
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - dx;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    scrollContainerRef.current?.classList.remove("is-dragging");
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 60);
  };

  const activeSessionIds = useMemo(() => {
    return new Set(activeSessions.map((s) => s.id));
  }, [activeSessions]);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative w-full h-full bg-[#0d1017]">
      {/* Bottom Floating Timeline Controls */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2 bg-[#161a26]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl text-xs text-white">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          className="h-8 px-2.5 text-xs hover:bg-white/10 text-slate-200 cursor-pointer"
          title="Zoom out timeline"
        >
          <ZoomOut className="w-3.5 h-3.5 mr-1" />
          Zoom out
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          className="h-8 px-2.5 text-xs hover:bg-white/10 text-slate-200 cursor-pointer"
          title="Zoom in timeline"
        >
          <ZoomIn className="w-3.5 h-3.5 mr-1" />
          Zoom in
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fitSchedule}
          className="h-8 px-2.5 text-xs hover:bg-white/10 text-slate-200 cursor-pointer"
          title="Fit entire day"
        >
          <Maximize2 className="w-3.5 h-3.5 mr-1" />
          Fit Day
        </Button>
        {isNowInBounds && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={scrollToNow}
            className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold cursor-pointer"
            title="Pan to current time"
          >
            <Target className="w-3.5 h-3.5 mr-1" />
            Go to Now
          </Button>
        )}
      </div>

      {/* Main Timeline Scrollable Viewport */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 overflow-x-auto overflow-y-auto relative select-none schedule-scroll-viewport flex flex-col"
      >
        <div
          ref={stageRef}
          className="relative min-w-full my-auto"
          style={{
            width: `${totalCanvasWidth}px`,
            height: `${canvasHeight}px`,
          }}
        >
          {/* 1. Time Ruler (Sticky at Top) */}
          <div
            className="sticky top-0 z-30 flex items-center bg-[#131622] border-b border-border/80 shadow-md"
            style={{
              width: `${totalCanvasWidth}px`,
              height: `${RULER_HEIGHT}px`,
            }}
          >
            {/* Top-left corner label */}
            <div
              className="sticky left-0 z-40 bg-[#161a26] border-r border-border/80 px-4 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-widest shrink-0"
              style={{ width: `${labelWidth}px`, height: `${RULER_HEIGHT}px` }}
            >
              <span>TRACKS</span>
              <span className="text-[10px] text-orange-400 font-normal">WIB</span>
            </div>

            {/* Time Ticks */}
            <div className="relative flex-1 h-full overflow-visible pointer-events-none">
              {ticks.map((t) => {
                const tickX = (t.min - T0) * scale;
                return (
                  <div
                    key={t.min}
                    className="absolute top-0 bottom-0 flex flex-col justify-end pb-1.5"
                    style={{ left: `${tickX}px` }}
                  >
                    <span
                      className={cn(
                        "font-mono tracking-tight",
                        isLargeDisplay ? "text-xs sm:text-sm font-extrabold" : "text-xs",
                        t.isHalf
                          ? "text-slate-500 font-normal text-[11px]"
                          : "text-slate-200 font-bold"
                      )}
                    >
                      {t.label}
                    </span>
                    <div
                      className={cn(
                        "w-px",
                        t.isHalf ? "h-1.5 bg-border/40" : "h-3 bg-orange-400"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Vertical Grid Lines Across All Lanes */}
          {ticks.map((t) => {
            const gridX = labelWidth + (t.min - T0) * scale;
            return (
              <div
                key={`grid-${t.min}`}
                className={cn(
                  "absolute pointer-events-none border-l",
                  t.isHalf ? "border-dashed border-white/5" : "border-solid border-white/10"
                )}
                style={{
                  left: `${gridX}px`,
                  top: `${RULER_HEIGHT}px`,
                  height: `${totalLanesHeight}px`,
                }}
              />
            );
          })}

          {/* 3. Horizontal Room Track Lanes */}
          {visibleLanes.map((lane, laneIdx) => {
            const laneTop = RULER_HEIGHT + laneIdx * laneHeight;
            const isMainStage = lane.name.toLowerCase().includes("atrium") || lane.name.toLowerCase().includes("main");
            const isRoom800 = lane.name.toLowerCase().includes("800");

            return (
              <React.Fragment key={lane.id}>
                {/* Lane Background Row & Divider */}
                <div
                  className="absolute left-0 right-0 border-b border-white/10 pointer-events-none"
                  style={{ top: `${laneTop}px`, height: `${laneHeight}px` }}
                />

                {/* Pinned Sticky Lane Label on the Left */}
                <div
                  className="sticky left-0 z-20 bg-[#161a26] border-r border-white/15 px-4 flex flex-col justify-center shadow-[4px_0_16px_rgba(0,0,0,0.5)]"
                  style={{
                    top: `${laneTop}px`,
                    width: `${labelWidth}px`,
                    height: `${laneHeight}px`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full shrink-0",
                        isLargeDisplay ? "w-3.5 h-3.5" : "w-2.5 h-2.5",
                        isMainStage
                          ? "bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.8)]"
                          : isRoom800
                          ? "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                          : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      )}
                    />
                    <h5
                      className={cn(
                        "text-white whitespace-nowrap",
                        isLargeDisplay
                          ? "font-black text-lg sm:text-xl md:text-2xl"
                          : "font-extrabold text-sm md:text-base"
                      )}
                    >
                      {lane.name}
                    </h5>
                  </div>
                  <span
                    className={cn(
                      "font-medium whitespace-nowrap block mt-1",
                      isLargeDisplay
                        ? "text-sm sm:text-base pl-5.5 text-slate-300 font-semibold"
                        : "text-xs text-slate-400 pl-4.5"
                    )}
                  >
                    {lane.subtitle}
                  </span>
                </div>
              </React.Fragment>
            );
          })}

          {/* 4. Canvas Plenary Sessions Spanning All Lanes (e.g. Open Gate) */}
          {filteredSessions
            .filter((s) => isCanvasPlenarySession(s))
            .map((session) => {
              const layout = plenaryLayoutMap.get(session.id);
              const blockLeft = layout
                ? layout.blockLeft
                : labelWidth + ((parseMinutesOfDay(session.startsAt) ?? T0) - T0) * scale + 2;
              const blockWidth = layout ? layout.blockWidth : 160;
              const isActive = activeSessionIds.has(session.id);
              const isFocused = focusedSessionId === session.id;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMovedRef.current) onSelectSession(session);
                  }}
                  className={cn(
                    "schedule-card-btn absolute rounded-2xl text-left cursor-pointer transition-all duration-200 overflow-hidden z-15 flex flex-col justify-between border",
                    isLargeDisplay ? "p-6 sm:p-8" : "p-4 sm:p-5",
                    isActive
                      ? "ring-2 ring-orange-400 border-orange-400 bg-gradient-to-r from-orange-950/80 via-purple-950/70 to-orange-950/80 shadow-[0_0_35px_rgba(255,153,0,0.6)] z-25 animate-pulse"
                      : isFocused
                      ? "ring-2 ring-cyan-400 border-cyan-400 bg-white/10 z-20"
                      : "bg-[#181d2c]/90 hover:bg-[#20273a] border-white/20 text-white shadow-lg hover:border-white/40"
                  )}
                  style={{
                    left: `${blockLeft}px`,
                    top: `${RULER_HEIGHT + 6}px`,
                    width: `${blockWidth}px`,
                    height: `${totalLanesHeight - 12}px`,
                  }}
                  title={session.title}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isActive && (
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider bg-orange-500 text-white shadow-sm", isLargeDisplay ? "px-3.5 py-1 text-xs" : "px-2.5 py-0.5 text-[10px]")}>
                          <Radio className={isLargeDisplay ? "w-4 h-4" : "w-3 h-3"} />
                          LIVE NOW
                        </span>
                      )}
                      <span className={cn("rounded-full font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/30 text-amber-300", isLargeDisplay ? "px-3.5 py-1 text-xs" : "px-2.5 py-0.5 text-[10px]")}>
                        {session.sessionType || "PLENARY"}
                      </span>
                      <span className={cn("text-orange-400 font-bold whitespace-nowrap", isLargeDisplay ? "text-sm sm:text-base font-extrabold" : "text-xs")}>
                        {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)} WIB
                      </span>
                    </div>

                    <span className={cn("font-semibold text-slate-300 hidden sm:inline", isLargeDisplay ? "text-sm sm:text-base" : "text-xs")}>
                      All Rooms (Main Stage)
                    </span>
                  </div>

                  {/* Center Content — Uncropped full title */}
                  <div className="my-auto py-2">
                    <h3
                      className={cn(
                        "font-black text-white leading-snug tracking-tight max-w-5xl break-words",
                        isLargeDisplay ? "text-3xl sm:text-5xl lg:text-6xl" : "text-lg sm:text-2xl"
                      )}
                    >
                      {session.title}
                    </h3>
                    {session.speakers.length > 0 && (
                      <p className={cn("font-semibold text-slate-300 mt-2", isLargeDisplay ? "text-base sm:text-xl" : "text-sm")}>
                        By {session.speakers.map((s) => s.name).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Bottom Footer */}
                  <div className={cn("text-slate-400 flex items-center justify-between w-full pt-2 border-t border-white/10", isLargeDisplay ? "text-sm" : "text-xs")}>
                    <span>AWS Community Day Jakarta 2026</span>
                    <span className="text-orange-400 font-semibold group-hover:underline">
                      Click for details →
                    </span>
                  </div>
                </button>
              );
            })}

          {/* 5. Parallel Track Session Blocks Positioned on Respective Lanes */}
          {filteredSessions
            .filter((s) => !isCanvasPlenarySession(s))
            .map((session) => {
              const layout = nonPlenaryLayoutMap.get(session.id);
              if (!layout) return null;
              const { laneIdx, blockLeft, blockWidth, blockTop, blockHeight, isShort, durationMin } = layout;

              const isActive = activeSessionIds.has(session.id);
              const isFocused = focusedSessionId === session.id;
              const isWorkshop = (session.sessionType || "").toLowerCase().includes("workshop");
              const speaker = session.speakers[0];

              if (isShort) {
                const shortMeta = getShortSessionMeta(session.title);
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasMovedRef.current) onSelectSession(session);
                    }}
                    className={cn(
                      "schedule-card-btn absolute rounded-xl text-left cursor-pointer transition-all duration-150 overflow-hidden flex flex-col justify-between border group",
                      isLargeDisplay ? "p-3 sm:p-3.5" : "p-2",
                      shortMeta.badgeBg,
                      shortMeta.badgeBorder,
                      isActive
                        ? "ring-2 ring-orange-400 border-orange-400 shadow-[0_0_24px_rgba(255,153,0,0.55)] z-30 text-white animate-pulse"
                        : isFocused
                        ? "ring-2 ring-cyan-400 border-cyan-400 z-20 text-white"
                        : "text-white shadow-md hover:border-orange-400/80 hover:z-50 hover:min-w-[190px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] z-10"
                    )}
                    style={{
                      left: `${blockLeft}px`,
                      top: `${blockTop}px`,
                      width: `${blockWidth}px`,
                      height: `${blockHeight}px`,
                    }}
                    title={`${session.title} (${formatTimeShort(session.startsAt)} – ${formatTimeShort(session.endsAt)} WIB)`}
                  >
                    {/* Header line: Icon + Time */}
                    <div className="flex items-center gap-1.5 w-full shrink-0">
                      <span className={cn("leading-none shrink-0", isLargeDisplay ? "text-base" : "text-xs")}>{shortMeta.icon}</span>
                      <span
                        className={cn(
                          "font-mono font-bold text-orange-400 shrink-0",
                          isLargeDisplay ? "text-xs sm:text-sm font-extrabold" : "text-[10px] sm:text-[11px]"
                        )}
                      >
                        {formatTimeShort(session.startsAt)}
                      </span>
                      <span className={cn("text-white/50 hidden group-hover:inline", isLargeDisplay ? "text-xs" : "text-[9px]")}>• {durationMin}m</span>
                    </div>

                    {/* Title: Crisp, readable, styled */}
                    <div className="my-auto py-0.5 flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
                      <span
                        className={cn(
                          "font-bold leading-tight text-white group-hover:text-orange-200 transition-colors break-words",
                          isLargeDisplay
                            ? "text-xs sm:text-sm lg:text-base leading-snug line-clamp-3"
                            : "text-[10px] sm:text-[11px] line-clamp-2"
                        )}
                      >
                        {session.title}
                      </span>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMovedRef.current) onSelectSession(session);
                  }}
                  className={cn(
                    "schedule-card-btn absolute rounded-xl text-left cursor-pointer transition-all duration-200 overflow-hidden z-10 flex flex-col justify-between border group",
                    isLargeDisplay ? "p-4 sm:p-5" : "p-3 sm:p-3.5",
                    isActive
                      ? "ring-2 ring-orange-400 border-orange-400 bg-orange-950/85 shadow-[0_0_24px_rgba(255,153,0,0.55)] z-25 text-white animate-pulse"
                      : isFocused
                      ? "ring-2 ring-cyan-400 border-cyan-400 bg-white/15 z-20 text-white"
                      : isWorkshop
                      ? "bg-purple-950/50 hover:bg-purple-950/75 border-purple-500/40 text-white hover:border-purple-400 shadow-md"
                      : "bg-[#161a28]/90 hover:bg-[#1e2336] border-white/15 text-white hover:border-white/35 shadow-md"
                  )}
                  style={{
                    left: `${blockLeft}px`,
                    top: `${blockTop}px`,
                    width: `${blockWidth}px`,
                    height: `${blockHeight}px`,
                  }}
                  title={session.title}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-1 w-full shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isActive && (
                        <span className={cn("inline-flex items-center gap-1 rounded-full font-black uppercase bg-orange-500 text-white shadow-sm", isLargeDisplay ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[9px]")}>
                          ● LIVE
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full font-bold uppercase tracking-wider",
                          isLargeDisplay ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[9px]",
                          isWorkshop
                            ? "bg-purple-500/25 border border-purple-400/30 text-purple-300"
                            : "bg-white/10 text-slate-300"
                        )}
                      >
                        {session.sessionType || "Talk"}
                      </span>
                    </div>

                    <span className={cn("font-mono font-bold text-orange-400 shrink-0", isLargeDisplay ? "text-xs sm:text-sm lg:text-base font-extrabold" : "text-[10px] sm:text-[11px]")}>
                      {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)}
                    </span>
                  </div>

                  {/* Title — Generous uncropped space */}
                  <div className="my-auto py-1 flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
                    <h4
                      className={cn(
                        "font-bold text-white leading-snug group-hover:text-orange-300 transition-colors break-words",
                        isLargeDisplay
                          ? "text-base sm:text-lg lg:text-xl font-black line-clamp-4"
                          : "text-[11px] sm:text-xs line-clamp-6"
                      )}
                    >
                      {session.title}
                    </h4>
                    {isLargeDisplay && session.description && (
                      <p className="text-xs sm:text-sm text-slate-300/85 line-clamp-3 mt-1.5 leading-relaxed font-normal">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Speaker Footer */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-white/10 shrink-0 w-full mt-auto">
                    {speaker && (
                      <Avatar className={cn("rounded-full border border-white/20 shrink-0 bg-slate-800", isLargeDisplay ? "w-8 h-8" : "w-5 h-5")}>
                        {speaker.avatar && (
                          <AvatarImage
                            src={speaker.avatar}
                            alt={speaker.name}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <AvatarFallback className="bg-orange-600/30 text-orange-300 font-bold text-[8px]">
                          {speaker.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className={cn("text-slate-300 truncate", isLargeDisplay ? "text-xs sm:text-sm font-bold" : "text-[11px] font-medium")}>
                      {speaker ? speaker.name : "Featured Presentation"}
                    </span>
                  </div>
                </button>
              );
            })}

          {/* 6. Glowing Vertical "CURRENT TIME" (NOW) Indicator Line */}
          {isNowInBounds && (
            <div
              className="absolute pointer-events-none z-30 transition-all duration-300"
              style={{
                left: `${nowX}px`,
                top: 0,
                height: `${canvasHeight}px`,
              }}
            >
              {/* Top floating flag */}
              <div className="sticky top-0 -translate-x-1/2 -mt-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(255,153,0,0.8)] flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                NOW {formatHourMin(Math.floor(currentMinutes))}
              </div>

              {/* Vertical line through all lanes */}
              <div className="w-[3px] h-full bg-gradient-to-b from-orange-500 via-orange-400 to-orange-500 shadow-[0_0_12px_rgba(255,153,0,0.8)] mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
