"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CalendarPlus,
  MapPin,
  Star,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTime,
  formatTimeShort,
  parseMinutesOfDay,
  formatHourMin,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  roomLabelOf,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";
import {
  RULER_HEIGHT,
  LANE_HEIGHT,
  BLOCK_HEIGHT,
  LABEL_WIDTH_DESKTOP,
  LABEL_WIDTH_MOBILE,
  type LaneDefinition,
  type ActiveTipState,
} from "./schedule-types";

interface ScheduleBoardViewProps {
  sessions: DisplayScheduleSession[];
  filteredSessions: DisplayScheduleSession[];
  savedSessionIds: string[];
  onToggleBookmark: (sessionId: string, e?: React.MouseEvent) => void;
  selectedRoom: string;
}

export function ScheduleBoardView({
  sessions,
  filteredSessions,
  savedSessionIds,
  onToggleBookmark,
  selectedRoom,
}: ScheduleBoardViewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2.8); // Pixels per minute
  const [activeTip, setActiveTip] = useState<ActiveTipState | null>(null);
  const hideTipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-to-pan refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Dynamic canvas calculations (Lanes, Time Boundaries, Visible Grid)
  const { T0, T1, allLanes, ticks } = useMemo(() => {
    let minM = 480; // 08:00 default
    let maxM = 1020; // 17:00 default

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

    // Build distinct tracks / room lanes
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
        id: "main-stage",
        name: "Main Stage",
        subtitle: "Keynotes & Sessions",
      });
    }

    // Sort lanes (Atrium / Main Stage first, then Room 800 / Classroom 1)
    builtLanes.sort((a, b) => {
      if (a.name.toLowerCase().includes("atrium") || a.name.toLowerCase().includes("main")) return -1;
      if (b.name.toLowerCase().includes("atrium") || b.name.toLowerCase().includes("main")) return 1;
      return a.name.localeCompare(b.name);
    });

    // 30-min time ticks for ruler
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

  // Visible lanes on the board respecting active room filter
  const visibleLanes = useMemo(() => {
    if (selectedRoom === "ALL") return allLanes;
    const target = selectedRoom.toLowerCase();
    return allLanes.filter((l) => {
      const lName = l.name.toLowerCase();
      return lName === target || (target.includes("800") && lName.includes("800"));
    });
  }, [allLanes, selectedRoom]);

  // Responsive label column width
  const [labelWidth, setLabelWidth] = useState(LABEL_WIDTH_DESKTOP);
  useEffect(() => {
    const handleResize = () => {
      setLabelWidth(window.innerWidth < 640 ? LABEL_WIDTH_MOBILE : LABEL_WIDTH_DESKTOP);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const timelineSpan = T1 - T0;
  const timelineWidth = timelineSpan * scale;
  const totalCanvasWidth = labelWidth + timelineWidth;
  const viewportHeight = RULER_HEIGHT + visibleLanes.length * LANE_HEIGHT;

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(6.5, s * 1.3));
  const zoomOut = () => setScale((s) => Math.max(1.6, s / 1.3));

  const fitDay = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const availableWidth = containerWidth - labelWidth - 36;
    if (availableWidth > 0 && timelineSpan > 0) {
      const fitScale = Math.max(2.0, availableWidth / timelineSpan);
      setScale(fitScale);
      scrollContainerRef.current.scrollLeft = 0;
      setActiveTip(null);
    }
  }, [labelWidth, timelineSpan]);

  // Set comfortable initial scale on mount
  useEffect(() => {
    if (sessions.length > 0) {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        setScale(2.8);
      } else {
        fitDay();
      }
    }
  }, [sessions.length, fitDay]);

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

  // Drag-to-Pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".schedule-blk, .btn-tip-action, button, a")) return;
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
      setActiveTip(null);
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

  // Anchored popover tooltip helper
  const showBlockTip = (
    session: DisplayScheduleSession,
    blockEl: HTMLElement,
    laneIdx: number,
    pin = false
  ) => {
    if (hasMovedRef.current) return;
    if (hideTipTimeoutRef.current) clearTimeout(hideTipTimeoutRef.current);
    if (!stageRef.current) return;

    const stageRect = stageRef.current.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();

    const tipWidth = 350;
    const blockCenterX = blockRect.left - stageRect.left + blockRect.width / 2;
    let tipLeft = blockCenterX - tipWidth / 2;
    tipLeft = Math.max(12, Math.min(tipLeft, stageRect.width - tipWidth - 12));

    const tipTop = blockRect.bottom - stageRect.top + 8;
    setActiveTip({
      session,
      left: tipLeft,
      top: tipTop,
      isPinned: pin,
    });
  };

  const hideBlockTip = (immediate = false) => {
    if (activeTip?.isPinned && !immediate) return;
    if (hideTipTimeoutRef.current) clearTimeout(hideTipTimeoutRef.current);
    if (immediate) {
      setActiveTip(null);
    } else {
      hideTipTimeoutRef.current = setTimeout(() => {
        setActiveTip((prev) => (prev?.isPinned ? prev : null));
      }, 250);
    }
  };

  // Close tip on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTip(null);
      }
    };
    const handleOutsideClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".schedule-blk, .schedule-popover-card")) {
        return;
      }
      setActiveTip(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Board Zoom & Navigation Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={zoomOut}
            className="h-8 px-2.5 text-xs cursor-pointer"
            title="Zoom out timeline"
          >
            <ZoomOut className="h-3.5 w-3.5 mr-1" />
            Zoom out
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={zoomIn}
            className="h-8 px-2.5 text-xs cursor-pointer"
            title="Zoom in timeline"
          >
            <ZoomIn className="h-3.5 w-3.5 mr-1" />
            Zoom in
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fitDay}
            className="h-8 px-2.5 text-xs cursor-pointer font-medium"
            title="Fit entire conference day on screen"
          >
            <Maximize2 className="h-3 w-3 mr-1" />
            Fit day
          </Button>
        </div>

        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-2">
          <span>💡 Drag canvas or scroll horizontally to pan. All times are WIB.</span>
        </div>
      </div>

      {/* Board Stage Container */}
      <div
        className="schedule-board-stage relative"
        ref={stageRef}
      >
        {/* Scrollable Canvas Viewport */}
        <div
          ref={scrollContainerRef}
          className="schedule-scroll-area relative rounded-2xl border border-border/80 bg-[#12141C] overflow-x-auto overflow-y-hidden cursor-grab shadow-inner"
          style={{ height: `${viewportHeight}px` }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          role="region"
          aria-label="Event schedule timeline board"
        >
          {/* Canvas Inner Space */}
          <div
            className="relative select-none"
            style={{
              width: `${totalCanvasWidth}px`,
              height: `${viewportHeight}px`,
              backgroundImage:
                "radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1.2px)",
              backgroundSize: "24px 24px",
            }}
          >
            {/* Top-Left Pinned Header Cell */}
            <div
              className="sticky top-0 left-0 z-40 bg-[#151822] border-r border-b border-border/80 flex items-center px-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-sm"
              style={{ width: `${labelWidth}px`, height: `${RULER_HEIGHT}px` }}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
              <span>Tracks</span>
            </div>

            {/* Continuous Sticky Time Ruler */}
            <div
              className="sticky top-0 z-30 bg-[#171A24]/95 backdrop-blur-md border-b border-border/80 flex items-center"
              style={{
                marginLeft: `${labelWidth}px`,
                width: `${timelineWidth}px`,
                height: `${RULER_HEIGHT}px`,
                marginTop: `-${RULER_HEIGHT}px`,
              }}
            >
              {ticks.map((t) => {
                const tickX = (t.min - T0) * scale;
                return (
                  <div
                    key={t.min}
                    className={cn(
                      "absolute top-0 h-full flex items-center pl-2 border-l font-mono text-xs select-none",
                      t.isHalf
                        ? "border-dashed border-border/50 text-muted-foreground/75 font-normal text-[11px]"
                        : "border-solid border-border/90 text-foreground font-bold"
                    )}
                    style={{ left: `${tickX}px` }}
                  >
                    {t.label}
                  </div>
                );
              })}
            </div>

            {/* Vertical Background Time Grid Lines */}
            {ticks.map((t) => {
              const gridX = labelWidth + (t.min - T0) * scale;
              return (
                <div
                  key={`grid-${t.min}`}
                  className={cn(
                    "absolute top-[44px] bottom-0 pointer-events-none border-l",
                    t.isHalf ? "border-dashed border-border/20" : "border-solid border-border/35"
                  )}
                  style={{ left: `${gridX}px` }}
                />
              );
            })}

            {/* Horizontal Room Track Lanes */}
            {visibleLanes.map((lane, laneIdx) => {
              const laneTop = RULER_HEIGHT + laneIdx * LANE_HEIGHT;

              return (
                <React.Fragment key={lane.id}>
                  {/* Lane Background Row & Divider */}
                  <div
                    className="absolute left-0 right-0 border-b border-border/50 pointer-events-none"
                    style={{ top: `${laneTop}px`, height: `${LANE_HEIGHT}px` }}
                  />

                  {/* Pinned Sticky Lane Label on the Left */}
                  <div
                    className="sticky left-0 z-20 bg-[#151822] border-r border-border/80 px-3.5 flex flex-col justify-center shadow-[4px_0_16px_rgba(0,0,0,0.5)]"
                    style={{
                      top: `${laneTop}px`,
                      width: `${labelWidth}px`,
                      height: `${LANE_HEIGHT}px`,
                      marginTop: laneIdx === 0 ? "0px" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          lane.name.toLowerCase().includes("atrium")
                            ? "bg-orange-500 shadow-[0_0_6px_rgba(255,153,0,0.6)]"
                            : "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.6)]"
                        )}
                      />
                      <h5 className="font-bold text-xs md:text-sm text-foreground truncate">
                        {lane.name}
                      </h5>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium truncate block mt-0.5">
                      {lane.subtitle}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Session Blocks Positioned on the Board */}
            {filteredSessions.map((session) => {
              const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
              const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 45;
              const durationMin = Math.max(20, endMin - startMin);

              const roomRaw = (session.rooms?.[0] || session.room || "").toLowerCase();
              let laneIdx = visibleLanes.findIndex((l) => {
                const lName = l.name.toLowerCase();
                return lName === roomRaw || (roomRaw.includes("800") && lName.includes("800"));
              });
              if (laneIdx < 0) {
                laneIdx = 0;
              }

              const blockLeft = labelWidth + (startMin - T0) * scale + 2;
              const blockWidth = Math.max(session.description ? 120 : 85, durationMin * scale - 4);
              const blockTop = RULER_HEIGHT + laneIdx * LANE_HEIGHT + 12;

              const isSaved = savedSessionIds.includes(session.id);
              const isActive = activeTip?.session.id === session.id;

              const formatLower = (session.sessionType || "").toLowerCase();
              const isWorkshop = formatLower.includes("workshop");
              const isKeynote =
                formatLower.includes("keynote") || formatLower.includes("fireside");
              const isService = session.isServiceSession;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showBlockTip(session, e.currentTarget, laneIdx, true);
                  }}
                  onMouseEnter={(e) => showBlockTip(session, e.currentTarget, laneIdx, false)}
                  onMouseLeave={() => hideBlockTip(false)}
                  className={cn(
                    "schedule-blk absolute rounded-xl p-2.5 text-left cursor-pointer transition-all duration-150 overflow-hidden z-10 flex flex-col justify-between border",
                    isWorkshop
                      ? "bg-purple-950/40 hover:bg-purple-950/65 border-purple-500/50 text-foreground"
                      : isKeynote
                      ? "bg-orange-950/45 hover:bg-orange-950/70 border-orange-500/50 text-foreground"
                      : isService
                      ? "bg-[#181A22] hover:bg-[#20232E] border-dashed border-border/70 text-muted-foreground"
                      : "bg-[#1D212E] hover:bg-[#262C3D] border-border/90 text-foreground",
                    isActive && "ring-2 ring-orange-500 shadow-xl z-20 -translate-y-0.5",
                    isSaved &&
                      "after:content-[''] after:absolute after:top-2 after:right-2 after:w-2 after:h-2 after:rounded-full after:bg-amber-400 after:shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                  )}
                  style={{
                    top: `${blockTop}px`,
                    left: `${blockLeft}px`,
                    width: `${blockWidth}px`,
                    height: `${BLOCK_HEIGHT}px`,
                  }}
                  aria-label={`${session.title}, ${formatTimeShort(session.startsAt)} to ${formatTimeShort(session.endsAt)}`}
                >
                  <div className="min-w-0 w-full">
                    <b className="block text-xs font-bold leading-tight truncate text-foreground">
                      {session.title}
                    </b>
                    <i className="block not-italic text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)} WIB
                    </i>
                    {/* Talk Description preview inside the board item */}
                    {session.description && (
                      <p className="text-[11px] text-slate-300/85 line-clamp-2 leading-tight mt-1 overflow-hidden font-normal whitespace-normal">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Speaker or track metadata */}
                  {session.speakers.length > 0 ? (
                    <div className="text-[10px] text-muted-foreground/90 font-medium truncate mt-1">
                      {session.speakers.map((s) => s.name).join(", ")}
                    </div>
                  ) : !session.description && session.track ? (
                    <div className="text-[10px] text-muted-foreground/75 font-medium truncate mt-1">
                      {session.track}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* 100% Solid Opaque Anchored Popover Card (No Modal Dialog!) */}
        {activeTip && (
          <div
            className="schedule-popover-card absolute z-50 w-[320px] sm:w-[350px] p-5 rounded-2xl shadow-2xl transition-all duration-150"
            style={{
              left: `${activeTip.left}px`,
              top: `${activeTip.top}px`,
            }}
            onMouseEnter={() => {
              if (hideTipTimeoutRef.current) clearTimeout(hideTipTimeoutRef.current);
            }}
            onMouseLeave={() => hideBlockTip(false)}
          >
            {/* Header: Title + Close Button */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                {activeTip.session.title}
              </h4>
              <button
                type="button"
                onClick={() => setActiveTip(null)}
                className="text-muted-foreground hover:text-white cursor-pointer -mt-1 -mr-1 p-1 rounded-md hover:bg-white/10"
                aria-label="Close session popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Time Badge & Room */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20">
                {formatTime(activeTip.session.startsAt, activeTip.session.endsAt)}
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>
                  {roomLabelOf(activeTip.session) || "Main Stage"}
                  {activeTip.session.track ? ` • ${activeTip.session.track}` : ""}
                </span>
              </span>
            </div>

            {/* Full Talk Description from Schedule */}
            {activeTip.session.description && (
              <div className="space-y-1.5 pt-2.5 pb-1 border-t border-slate-700/60 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                  About this talk
                </span>
                <div className="max-h-44 sm:max-h-48 overflow-y-auto pr-1 text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-2 scrollbar-thin">
                  {activeTip.session.description}
                </div>
              </div>
            )}

            {/* Speakers Spotlight */}
            {activeTip.session.speakers.length > 0 && (
              <div className="text-xs text-slate-200 mb-3 pt-2 border-t border-slate-700/60">
                <span className="font-semibold text-white">
                  {activeTip.session.speakers.map((s) => s.name).join(", ")}
                </span>
                {activeTip.session.speakers[0]?.company && (
                  <span className="text-slate-400">
                    {" "}
                    ({activeTip.session.speakers[0].company})
                  </span>
                )}
              </div>
            )}

            {/* Metadata tags */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3.5">
              {activeTip.session.sessionType && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeTip.session.sessionType}
                </span>
              )}
              {activeTip.session.languages.map((l) => (
                <span
                  key={l}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400"
                >
                  {l}
                </span>
              ))}
            </div>

            {/* Instant Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-700/70">
              <Button
                type="button"
                variant={savedSessionIds.includes(activeTip.session.id) ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleBookmark(activeTip.session.id)}
                className={cn(
                  "btn-tip-action h-8 px-3 text-xs font-semibold cursor-pointer",
                  savedSessionIds.includes(activeTip.session.id)
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                    : "border-slate-600 text-slate-200 hover:bg-slate-800"
                )}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5 mr-1.5",
                    savedSessionIds.includes(activeTip.session.id) ? "fill-white" : ""
                  )}
                />
                {savedSessionIds.includes(activeTip.session.id) ? "Saved" : "Save Talk"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="btn-tip-action h-8 px-3 text-xs font-medium cursor-pointer border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                <a
                  href={generateGoogleCalendarUrl(activeTip.session)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarPlus className="h-3.5 w-3.5 mr-1 text-orange-400" />
                  GCal
                </a>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadIcsFile(
                    [activeTip.session],
                    `${activeTip.session.title.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "-")}.ics`
                  )
                }
                className="btn-tip-action h-8 px-3 text-xs font-medium cursor-pointer border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-orange-400" />
                .ICS
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Legend matching reference HTML */}
      <div className="flex items-center gap-4.5 flex-wrap text-xs text-muted-foreground pt-4 border-t border-border/40 px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-orange-950/60 border border-orange-500/50"></span>
          Keynote & Plenary
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#1D212E] border border-border"></span>
          Tech Talk
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-purple-950/60 border border-purple-500/50"></span>
          Workshop (Hands-on)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-dashed border-border/80 bg-[#181A22]"></span>
          Rundown & Networking
        </span>
      </div>
    </div>
  );
}
