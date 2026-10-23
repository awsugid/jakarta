"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar,
  CalendarPlus,
  Clock,
  MapPin,
  Search,
  Star,
  Download,
  ExternalLink,
  Building,
  AlertCircle,
  Loader2,
  X,
  Globe,
  Gauge,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Layers,
} from "lucide-react";
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
  formatTimeShort,
  parseMinutesOfDay,
  formatHourMin,
  getDurationMinutes,
  formatDuration,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  roomLabelOf,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";

interface ComDayScheduleProps {
  eventSlug?: string;
  className?: string;
}

interface LaneDefinition {
  id: string;
  name: string;
  subtitle: string;
}

interface ActiveTipState {
  session: DisplayScheduleSession;
  left: number;
  top?: number;
  bottom?: number;
  isPinned: boolean;
}

const STORAGE_KEY = "comday26_saved_sessions";
const RULER_HEIGHT = 44; // Ruler height (px)
const LANE_HEIGHT = 100; // Lane row height (px)
const LABEL_WIDTH_DESKTOP = 140; // Sticky label column width desktop (px)
const LABEL_WIDTH_MOBILE = 96; // Sticky label column width mobile (px)

export function ComDaySchedule({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  className,
}: ComDayScheduleProps) {
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exactly 2 Modes: 'board' vs 'list'
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [userPickedView, setUserPickedView] = useState(false);

  // Filters
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  // List View Accordion Expansion State (sessionId -> boolean)
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Bookmarks / Saved sessions
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  // Board Canvas Viewport refs & state
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
          // Whenever viewport enters mobile width: automatically switch to list mode!
          setViewMode("list");
          setUserPickedView(false);
        } else {
          // Returning to desktop width: switch back to board mode!
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
  const distinctRoomOptions = useMemo(() => {
    const map = new Map<string, { name: string; track: string; count: number }>();
    sessions.forEach((s) => {
      const roomName = (s.rooms?.[0] || s.room || "").trim();
      if (!roomName) return;
      const key = roomName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: roomName,
          track: s.track || (roomName.toLowerCase().includes("atrium") ? "Main Stage" : "Classroom 1"),
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
          sess.rooms.some((r) => r.toLowerCase() === target) ||
          (!sess.rooms.length && (sess.room || "").toLowerCase() === target);
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

  // ---------------------------------------------------------------------------
  // Canvas Board Calculations (Lanes, Time Boundaries, Visible Grid)
  // ---------------------------------------------------------------------------
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
    if (maxM <= minM + 120) {
      maxM = minM + 180;
    }

    // Build all unique lanes from sessions
    const laneMap = new Map<string, LaneDefinition>();
    sessions.forEach((s) => {
      const roomName = (s.rooms?.[0] || s.room || "").trim();
      if (!roomName) return;
      const key = roomName.toLowerCase();
      if (!laneMap.has(key)) {
        laneMap.set(key, {
          id: key,
          name: roomName,
          subtitle: s.track || (roomName.toLowerCase().includes("atrium") ? "Main Stage" : "Classroom 1"),
        });
      }
    });

    // If no distinct rooms found, provide sensible fallback
    const builtLanes = Array.from(laneMap.values());
    if (builtLanes.length === 0) {
      builtLanes.push({
        id: "main-stage",
        name: "Main Stage",
        subtitle: "Keynotes & Sessions",
      });
    }

    // Sort lanes (Atrium / Main Stage first, then Aula / Classroom 1, etc.)
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
    return allLanes.filter((l) => l.name.toLowerCase() === selectedRoom.toLowerCase());
  }, [allLanes, selectedRoom]);

  // Label column width (desktop vs mobile)
  const [labelWidth, setLabelWidth] = useState(LABEL_WIDTH_DESKTOP);
  useEffect(() => {
    const handleResize = () => {
      setLabelWidth(window.innerWidth < 640 ? LABEL_WIDTH_MOBILE : LABEL_WIDTH_DESKTOP);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Timeline canvas pixel width (time span * scale)
  const timelineSpan = T1 - T0;
  const timelineWidth = timelineSpan * scale;
  const totalCanvasWidth = labelWidth + timelineWidth;

  // Zoom controls
  const zoomIn = () => {
    setScale((s) => Math.min(6.5, s * 1.3));
  };

  const zoomOut = () => {
    setScale((s) => Math.max(1.6, s / 1.3));
  };

  const fitDay = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const availableWidth = containerWidth - labelWidth - 36;
    if (availableWidth > 0 && timelineSpan > 0) {
      const fitScale = Math.max(1.8, availableWidth / timelineSpan);
      setScale(fitScale);
      scrollContainerRef.current.scrollLeft = 0;
      setActiveTip(null);
    }
  }, [labelWidth, timelineSpan]);

  // Auto-fit on initial load of board mode
  useEffect(() => {
    if (viewMode === "board" && !loading && sessions.length > 0) {
      fitDay();
    }
  }, [viewMode, loading, sessions.length, fitDay]);

  // Horizontal wheel handler (maps normal mouse wheel to horizontal scrolling)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    } else if (e.deltaY !== 0 && e.deltaX === 0 && scrollContainerRef.current) {
      // Natural horizontal scrolling with standard mouse wheel
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Mouse Drag-To-Pan handlers
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
  };

  // Anchored popover tooltip helper for session blocks (No blocking modal dialog!)
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

    // Position tip horizontally centered on block, clamped within visible stage bounds
    const tipWidth = 320;
    const blockCenterX = blockRect.left - stageRect.left + blockRect.width / 2;
    let tipLeft = blockCenterX - tipWidth / 2;
    tipLeft = Math.max(12, Math.min(tipLeft, stageRect.width - tipWidth - 12));

    // Place tip below block on lane 0, or above block on lower lanes
    const isTopHalf = laneIdx === 0;
    setActiveTip({
      session,
      left: tipLeft,
      top: isTopHalf ? blockRect.bottom - stageRect.top + 8 : undefined,
      bottom: !isTopHalf ? stageRect.bottom - blockRect.top + 8 : undefined,
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

  // Close tip on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTip(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const viewportHeight = RULER_HEIGHT + visibleLanes.length * LANE_HEIGHT;

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/70 shadow-sm">
        {/* Left: View Mode Toggle & Track Filter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Mode Switcher (Full-width on mobile like reference .seg { display: flex; } .seg .btn { flex: 1; }) */}
          <div className="schedule-seg-wrapper w-full sm:w-auto inline-flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0">
            <button
              type="button"
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                viewMode === "board"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "board"}
              onClick={() => {
                setUserPickedView(true);
                setViewMode("board");
                setActiveTip(null);
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "list"}
              onClick={() => {
                setUserPickedView(true);
                setViewMode("list");
                setActiveTip(null);
              }}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          {/* Track Filter Pills (Always Accessible) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedRoom("ALL");
                setOnlySaved(false);
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                selectedRoom === "ALL" && !onlySaved
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
              )}
            >
              All Tracks
            </button>

            {distinctRoomOptions.map((opt) => (
              <button
                key={opt.name}
                type="button"
                onClick={() => {
                  setSelectedRoom(opt.name);
                  setOnlySaved(false);
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5",
                  selectedRoom.toLowerCase() === opt.name.toLowerCase() && !onlySaved
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    opt.name.toLowerCase().includes("atrium") ? "bg-orange-500" : "bg-purple-400"
                  )}
                />
                <span>
                  {opt.name} <span className="opacity-75">({opt.track})</span>
                </span>
              </button>
            ))}

            {/* Saved talks shortcut */}
            <button
              type="button"
              onClick={() => setOnlySaved((prev) => !prev)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border",
                onlySaved
                  ? "bg-amber-500 text-white border-amber-500 font-bold shadow-xs"
                  : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
              )}
              title="Show only bookmarked talks"
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  savedSessionIds.length > 0 || onlySaved ? "fill-current text-current" : ""
                )}
              />
              <span>Saved</span>
              {savedSessionIds.length > 0 && (
                <span className="text-[10px] font-bold opacity-90">({savedSessionIds.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Search & Bulk .ICS Export */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search talks, speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8.5 text-xs bg-background/60 border-border/60 focus:border-orange-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              downloadIcsFile(
                onlySaved && savedSessions.length > 0 ? savedSessions : sessions,
                onlySaved
                  ? "AWS-Community-Day-2026-My-Schedule.ics"
                  : "AWS-Community-Day-2026-Agenda.ics"
              )
            }
            className="h-8.5 text-xs font-medium cursor-pointer shrink-0"
            title="Download full conference calendar (.ics)"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-orange-400" />
            <span>.ICS</span>
          </Button>
        </div>
      </div>

      {/* FILTER ACTIVE STATUS FEEDBACK */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{filteredSessions.length}</strong> of{" "}
            {sessions.length} sessions
            {selectedRoom !== "ALL" && ` in ${selectedRoom}`}
            {onlySaved && " • Saved only"}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading confirmed agenda...
          </p>
        </div>
      ) : error ? (
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
          {/* ============================================================ */}
          {/* MODE 1: BOARD VIEW (Horizontal Canvas Schedule Board)        */}
          {/* ============================================================ */}
          {viewMode === "board" && (
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
              <div className="relative" ref={stageRef}>
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

                      // Determine which visible lane this session belongs to
                      const roomName = (session.rooms?.[0] || session.room || "").toLowerCase();
                      let laneIdx = visibleLanes.findIndex(
                        (l) => l.name.toLowerCase() === roomName
                      );
                      if (laneIdx < 0) {
                        // If session is all-rooms or plenary, default to lane 0
                        laneIdx = 0;
                      }

                      const blockLeft = labelWidth + (startMin - T0) * scale + 2;
                      const blockWidth = Math.max(76, durationMin * scale - 4);
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
                            "schedule-blk absolute h-[76px] rounded-xl p-2.5 text-left cursor-pointer transition-all duration-150 overflow-hidden z-10 flex flex-col justify-between border",
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
                          }}
                          aria-label={`${session.title}, ${formatTimeShort(session.startsAt)} to ${formatTimeShort(session.endsAt)}`}
                        >
                          <div>
                            <b className="block text-xs font-bold leading-tight truncate text-foreground">
                              {session.title}
                            </b>
                            <i className="block not-italic text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                              {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)} WIB
                            </i>
                          </div>

                          {session.speakers.length > 0 && durationMin >= 35 && (
                            <div className="text-[10px] text-muted-foreground/90 font-medium truncate">
                              {session.speakers.map((s) => s.name).join(", ")}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 100% Solid Opaque Anchored Popover Card (No Modal Dialog!) */}
                {activeTip && (
                  <div
                    className="schedule-popover-card absolute z-50 w-[320px] sm:w-[340px] p-4.5 rounded-2xl"
                    style={{
                      left: `${activeTip.left}px`,
                      top: activeTip.top !== undefined ? `${activeTip.top}px` : undefined,
                      bottom: activeTip.bottom !== undefined ? `${activeTip.bottom}px` : undefined,
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
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        {formatTime(activeTip.session.startsAt, activeTip.session.endsAt)}
                      </span>
                      <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-orange-400 shrink-0" />
                        <span>
                          {roomLabelOf(activeTip.session) || "Main Stage"}
                          {activeTip.session.track ? ` • ${activeTip.session.track}` : ""}
                        </span>
                      </span>
                    </div>

                    {/* Session Description */}
                    {activeTip.session.description && (
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-3">
                        {activeTip.session.description}
                      </p>
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
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {activeTip.session.sessionType && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {activeTip.session.sessionType}
                        </span>
                      )}
                      {activeTip.session.languages.map((l) => (
                        <span
                          key={l}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400"
                        >
                          {l}
                        </span>
                      ))}
                    </div>

                    {/* Instant Action Toolbar */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-700/70">
                      <Button
                        type="button"
                        variant={savedSessionIds.includes(activeTip.session.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBookmark(activeTip.session.id)}
                        className={cn(
                          "btn-tip-action h-7.5 px-3 text-xs font-semibold cursor-pointer",
                          savedSessionIds.includes(activeTip.session.id)
                            ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                            : "border-slate-600 text-slate-200 hover:bg-slate-800"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3 mr-1",
                            savedSessionIds.includes(activeTip.session.id) ? "fill-white" : ""
                          )}
                        />
                        {savedSessionIds.includes(activeTip.session.id) ? "Saved" : "Save Talk"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="btn-tip-action h-7.5 px-3 text-xs font-medium cursor-pointer border-slate-600 text-slate-200 hover:bg-slate-800"
                      >
                        <a
                          href={generateGoogleCalendarUrl(activeTip.session)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <CalendarPlus className="h-3 w-3 mr-1 text-orange-400" />
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
                        className="btn-tip-action h-7.5 px-3 text-xs font-medium cursor-pointer border-slate-600 text-slate-200 hover:bg-slate-800"
                      >
                        <Download className="h-3 w-3 mr-1 text-orange-400" />
                        .ICS
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend matching reference HTML */}
              <div className="flex items-center gap-4.5 flex-wrap text-xs text-muted-foreground pt-1.5 px-1">
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
          )}

          {/* ============================================================ */}
          {/* MODE 2: LIST VIEW (Desktop-Sized Clean Accordion List)       */}
          {/* ============================================================ */}
          {viewMode === "list" && (
            <div className="space-y-3.5">
              {filteredSessions.map((session) => {
                const isSaved = savedSessionIds.includes(session.id);
                const isExpanded = expandedSessionIds[session.id] || false;
                const durationMin = getDurationMinutes(session.startsAt, session.endsAt);
                const startTimeStr = formatTimeShort(session.startsAt);
                const durationOrEnd = durationMin
                  ? formatDuration(durationMin)
                  : formatTimeShort(session.endsAt);

                const roomName = (session.rooms?.[0] || session.room || "").toLowerCase();
                const isAtrium = roomName.includes("atrium");

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "schedule-list-item rounded-2xl border transition-all duration-200 overflow-hidden",
                      isExpanded
                        ? "border-orange-500/50 bg-card/90 shadow-lg ring-1 ring-orange-500/20"
                        : "border-border/70 bg-card/40 hover:bg-card/75 hover:border-border"
                    )}
                  >
                    {/* Spacious Desktop-Sized Header Row */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpand(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(session.id);
                        }
                      }}
                      className="p-4 sm:p-5 md:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                      aria-expanded={isExpanded}
                      aria-controls={`detail-${session.id}`}
                    >
                      {/* Left Block: Time Column + Info Column */}
                      <div className="flex items-start gap-4 md:gap-6 min-w-0 flex-1">
                        {/* Time Box (Prominent & Clean) */}
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
                              {session.track ? ` • ${session.track}` : ""}
                            </span>

                            {session.sessionType && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40">
                                {session.sessionType}
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

                          {/* Speaker Line (Collapsed preview) */}
                          {!isExpanded && session.speakers.length > 0 && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
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
                        </div>
                      </div>

                      {/* Right Block: Bookmark Button & Animated Chevron */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(session.id, e)}
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
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Session Overview
                              </h5>
                              <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                                {session.description}
                              </p>
                            </div>
                          )}

                          {/* Speaker Spotlight Cards */}
                          {session.speakers.length > 0 && (
                            <div className="space-y-2.5 pt-2 border-t border-border/40">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Speaker{session.speakers.length > 1 ? "s" : ""}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {session.speakers.map((speaker, idx) => (
                                  <div
                                    key={speaker.id || `${session.id}-spk-${idx}`}
                                    className="p-3.5 rounded-xl bg-card border border-border/60 flex items-center gap-3.5 shadow-2xs"
                                  >
                                    <Avatar className="h-11 w-11 rounded-xl border border-orange-500/30 shrink-0">
                                      <AvatarImage src={speaker.avatar || undefined} />
                                      <AvatarFallback className="rounded-xl bg-primary/20 text-primary font-bold text-xs">
                                        {speaker.name.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                      <h6 className="text-sm font-bold text-foreground truncate">
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
                                      </h6>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {speaker.role || "Speaker"}
                                      </p>
                                      {speaker.company && (
                                        <p className="text-xs text-muted-foreground/75 truncate flex items-center gap-1 mt-0.5">
                                          <Building className="h-3 w-3 text-orange-400" />
                                          <span>{speaker.company}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Time & Venue Details */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs md:text-sm text-muted-foreground">
                            <span className="font-mono text-foreground font-semibold flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-orange-400" />
                              {formatTime(session.startsAt, session.endsAt)} (Asia/Jakarta)
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-orange-400" />
                              {roomLabelOf(session) || "Main Stage"}
                              {session.track ? ` (${session.track})` : ""}
                            </span>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t border-border/40">
                            <Button
                              type="button"
                              variant={isSaved ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => toggleBookmark(session.id, e)}
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
                              <Download className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
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
          )}
        </div>
      )}
    </div>
  );
}

// Preserve Astro React client renderer symbol
(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";
