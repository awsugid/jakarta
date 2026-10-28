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
  LANE_HEIGHT,
  LABEL_WIDTH_DESKTOP,
  LABEL_WIDTH_MOBILE,
  type LaneDefinition,
} from "@/components/community-day/schedule-types";
import { isPlenarySession } from "./schedule-stage-helpers";

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
  const [scale, setScale] = useState(3.0); // pixels per minute
  const [labelWidth, setLabelWidth] = useState(LABEL_WIDTH_DESKTOP);

  // Drag-to-pan states
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Responsive label width
  useEffect(() => {
    const handleResize = () => {
      setLabelWidth(window.innerWidth < 640 ? LABEL_WIDTH_MOBILE : LABEL_WIDTH_DESKTOP);
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

  const timelineSpan = T1 - T0;
  const timelineWidth = timelineSpan * scale;
  const totalCanvasWidth = labelWidth + timelineWidth;
  const totalLanesHeight = visibleLanes.length * LANE_HEIGHT;
  const canvasHeight = Math.max(500, RULER_HEIGHT + totalLanesHeight);

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
  const zoomIn = () => setScale((s) => Math.min(6.0, s * 1.25));
  const zoomOut = () => setScale((s) => Math.max(1.5, s / 1.25));
  const fitSchedule = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const avail = scrollContainerRef.current.clientWidth - labelWidth - 40;
    if (avail > 0 && timelineSpan > 0) {
      setScale(Math.max(1.6, avail / timelineSpan));
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

  // Initial fit or scroll to now
  useEffect(() => {
    if (isNowInBounds) {
      scrollToNow();
    } else {
      fitSchedule();
    }
  }, []);

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
        className="flex-1 overflow-x-auto overflow-y-auto relative select-none schedule-scroll-viewport"
      >
        <div
          ref={stageRef}
          className="relative min-w-full"
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
              <span className="text-[10px] text-orange-400 font-normal">WIB (UTC+7)</span>
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
                        "font-mono text-xs tracking-tight",
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
                  "absolute top-[48px] bottom-0 pointer-events-none border-l",
                  t.isHalf ? "border-dashed border-white/5" : "border-solid border-white/10"
                )}
                style={{ left: `${gridX}px` }}
              />
            );
          })}

          {/* 3. Horizontal Room Track Lanes */}
          {visibleLanes.map((lane, laneIdx) => {
            const laneTop = RULER_HEIGHT + laneIdx * LANE_HEIGHT;
            const isMainStage = lane.name.toLowerCase().includes("atrium") || lane.name.toLowerCase().includes("main");
            const isRoom800 = lane.name.toLowerCase().includes("800");

            return (
              <React.Fragment key={lane.id}>
                {/* Lane Background Row & Divider */}
                <div
                  className="absolute left-0 right-0 border-b border-white/10 pointer-events-none"
                  style={{ top: `${laneTop}px`, height: `${LANE_HEIGHT}px` }}
                />

                {/* Pinned Sticky Lane Label on the Left */}
                <div
                  className="sticky left-0 z-20 bg-[#161a26] border-r border-white/15 px-4 flex flex-col justify-center shadow-[4px_0_16px_rgba(0,0,0,0.5)]"
                  style={{
                    top: `${laneTop}px`,
                    width: `${labelWidth}px`,
                    height: `${LANE_HEIGHT}px`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        isMainStage
                          ? "bg-orange-500 shadow-[0_0_8px_rgba(255,153,0,0.8)]"
                          : isRoom800
                          ? "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                          : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      )}
                    />
                    <h5 className="font-extrabold text-sm md:text-base text-white truncate">
                      {lane.name}
                    </h5>
                  </div>
                  <span className="text-xs text-slate-400 font-medium truncate block mt-0.5 pl-4.5">
                    {lane.subtitle}
                  </span>
                </div>
              </React.Fragment>
            );
          })}

          {/* 4. Plenary Sessions Spanning All Lanes (Keynote, Open Gate, Opening, Closing) */}
          {filteredSessions
            .filter((s) => isPlenarySession(s))
            .map((session) => {
              const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
              const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 45;
              const durationMin = Math.max(20, endMin - startMin);

              const blockLeft = labelWidth + (startMin - T0) * scale + 2;
              const blockWidth = Math.max(140, durationMin * scale - 4);
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
                    "schedule-card-btn absolute rounded-2xl p-4 text-left cursor-pointer transition-all duration-200 overflow-hidden z-15 flex flex-col justify-between border",
                    isActive
                      ? "ring-2 ring-orange-400 border-orange-400 bg-gradient-to-r from-orange-950/70 via-purple-950/60 to-orange-950/70 shadow-[0_0_30px_rgba(255,153,0,0.5)] z-25 animate-pulse"
                      : isFocused
                      ? "ring-2 ring-cyan-400 border-cyan-400 bg-white/10 z-20"
                      : "bg-[#181d2c]/85 hover:bg-[#20273a] border-white/20 text-white shadow-lg hover:border-white/40"
                  )}
                  style={{
                    left: `${blockLeft}px`,
                    top: `${RULER_HEIGHT + 8}px`,
                    width: `${blockWidth}px`,
                    height: `${totalLanesHeight - 16}px`,
                  }}
                  title="Click to view details"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white shadow-sm">
                          <Radio className="w-3 h-3" />
                          LIVE NOW
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/30 text-amber-300">
                        {session.sessionType || "PLENARY"}
                      </span>
                      <span className="text-xs text-orange-400 font-bold">
                        {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)} WIB
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-300">
                      All Rooms (Main Stage)
                    </span>
                  </div>

                  {/* Center Content */}
                  <div className="my-auto py-2">
                    <h3 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight max-w-4xl line-clamp-2">
                      {session.title}
                    </h3>
                    {session.speakers.length > 0 && (
                      <p className="text-sm font-semibold text-slate-300 mt-1">
                        By {session.speakers.map((s) => s.name).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Bottom Footer */}
                  <div className="text-xs text-slate-400 flex items-center justify-between w-full pt-1 border-t border-white/10">
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
            .filter((s) => !isPlenarySession(s))
            .map((session) => {
              const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
              const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 45;
              const durationMin = Math.max(20, endMin - startMin);

              const roomRaw = (session.rooms?.[0] || session.room || "").toLowerCase();
              let laneIdx = visibleLanes.findIndex((l) => {
                const lName = l.name.toLowerCase();
                return lName === roomRaw || (roomRaw.includes("800") && lName.includes("800"));
              });
              if (laneIdx < 0) laneIdx = 0;

              const blockLeft = labelWidth + (startMin - T0) * scale + 2;
              const blockWidth = Math.max(120, durationMin * scale - 4);
              const blockTop = RULER_HEIGHT + laneIdx * LANE_HEIGHT + 10;
              const blockHeight = LANE_HEIGHT - 20;

              const isActive = activeSessionIds.has(session.id);
              const isFocused = focusedSessionId === session.id;
              const isWorkshop = (session.sessionType || "").toLowerCase().includes("workshop");
              const speaker = session.speakers[0];

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasMovedRef.current) onSelectSession(session);
                  }}
                  className={cn(
                    "schedule-card-btn absolute rounded-xl p-3 text-left cursor-pointer transition-all duration-200 overflow-hidden z-10 flex flex-col justify-between border",
                    isActive
                      ? "ring-2 ring-orange-400 border-orange-400 bg-orange-950/80 shadow-[0_0_24px_rgba(255,153,0,0.5)] z-25 text-white animate-pulse"
                      : isFocused
                      ? "ring-2 ring-cyan-400 border-cyan-400 bg-white/15 z-20 text-white"
                      : isWorkshop
                      ? "bg-purple-950/45 hover:bg-purple-950/70 border-purple-500/40 text-white hover:border-purple-400"
                      : "bg-[#181d2a]/85 hover:bg-[#20273a] border-white/15 text-white hover:border-white/35"
                  )}
                  style={{
                    left: `${blockLeft}px`,
                    top: `${blockTop}px`,
                    width: `${blockWidth}px`,
                    height: `${blockHeight}px`,
                  }}
                  title="Click to view full details"
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-orange-500 text-white shadow-sm">
                          ● LIVE
                        </span>
                      )}
                      <span
                        className={cn(
                          "px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          isWorkshop
                            ? "bg-purple-500/25 border border-purple-400/30 text-purple-300"
                            : "bg-white/10 text-slate-300"
                        )}
                      >
                        {session.sessionType || "Talk"}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] font-bold text-orange-400 shrink-0">
                      {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-xs sm:text-sm text-white leading-snug line-clamp-2 my-1">
                    {session.title}
                  </h4>

                  {/* Speaker Footer */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-auto">
                    {speaker && (
                      <Avatar className="w-5 h-5 rounded-full border border-white/20 shrink-0 bg-slate-800">
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
                    <span className="text-[11px] font-medium text-slate-300 truncate">
                      {speaker ? speaker.name : "Featured Presentation"}
                    </span>
                  </div>
                </button>
              );
            })}

          {/* 6. Glowing Vertical "CURRENT TIME" (NOW) Indicator Line */}
          {isNowInBounds && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-all duration-300"
              style={{ left: `${nowX}px` }}
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
