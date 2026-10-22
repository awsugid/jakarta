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
  Check,
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
}

const STORAGE_KEY = "comday26_saved_sessions";
const RH = 40; // Ruler height (px)
const LH = 96; // Lane height (px)
const LW_DESKTOP = 112; // Lane label width desktop (px)
const LW_MOBILE = 84; // Lane label width mobile (px)

export function ComDaySchedule({
  eventSlug = COMMUNITY_DAY_EVENT_SLUG,
  className,
}: ComDayScheduleProps) {
  const [sessions, setSessions] = useState<DisplayScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exactly 2 Modes: 'board' vs 'list' (defaults by screen width, respects user selection)
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [userPickedView, setUserPickedView] = useState(false);

  // Filters
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  // Inline Accordion (List mode) — map of sessionId -> boolean (No modal dialog!)
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Bookmarks / Saved sessions
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);

  // Board Canvas Viewport refs & state
  const stageRef = useRef<HTMLDivElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2.8);
  const [tx, setTx] = useState(LW_DESKTOP);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTip, setActiveTip] = useState<ActiveTipState | null>(null);

  // Pointer tracking refs for drag-to-pan & pinch-to-zoom
  const pointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const startXRef = useRef(0);
  const startTxRef = useRef(0);
  const movedRef = useRef(false);
  const pinchDistRef = useRef(0);
  const hideTipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive mode selection on mount & resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateDefaultView = () => {
      if (!userPickedView) {
        setViewMode(window.innerWidth < 768 ? "list" : "board");
      }
    };

    updateDefaultView();
    window.addEventListener("resize", updateDefaultView);
    return () => window.removeEventListener("resize", updateDefaultView);
  }, [userPickedView]);

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

  // Extract distinct stages/rooms for filtering
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
        const inMeta = [...sess.languages, ...sess.levels].some((v) =>
          v.toLowerCase().includes(q)
        );
        if (!inTitle && !inDesc && !inSpeaker && !inRoom && !inMeta) return false;
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
  // Canvas Board Calculations (Lanes, Time Boundaries, Positioning)
  // ---------------------------------------------------------------------------
  const { T0, T1, lanes, sessionLaneMap, ticks } = useMemo(() => {
    let minM = 540; // Default: 09:00
    let maxM = 1050; // Default: 17:30

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

    // Build tracks / lanes
    const laneList: LaneDefinition[] = [];
    const hasPlenary = sessions.some(
      (s) => s.allRooms || s.isServiceSession || (!s.rooms.length && !s.room)
    );

    if (hasPlenary) {
      laneList.push({
        id: "main-stage",
        name: "Main Stage",
        subtitle: "Keynotes & Plenary",
      });
    }

    availableRooms.forEach((room) => {
      if (room.toLowerCase() !== "all rooms") {
        laneList.push({
          id: room,
          name: room,
          subtitle: room.toLowerCase().includes("800")
            ? "Cloud & Architecture"
            : "DevOps & AI",
        });
      }
    });

    if (laneList.length === 0) {
      laneList.push({
        id: "main-hall",
        name: "Conference Stage",
        subtitle: "Keynotes and sessions",
      });
    }

    // Map each session to a lane index
    const sLaneMap = new Map<string, number>();
    sessions.forEach((s) => {
      if (s.allRooms || s.isServiceSession || (!s.rooms.length && !s.room)) {
        sLaneMap.set(s.id, 0);
      } else {
        const roomName = s.rooms[0] || s.room || "";
        const idx = laneList.findIndex((l) => l.name.toLowerCase() === roomName.toLowerCase());
        sLaneMap.set(s.id, idx >= 0 ? idx : 0);
      }
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
      lanes: laneList,
      sessionLaneMap: sLaneMap,
      ticks: tickList,
    };
  }, [sessions, availableRooms]);

  // Label width depending on viewport width
  const labelWidth = typeof window !== "undefined" && window.innerWidth < 640 ? LW_MOBILE : LW_DESKTOP;

  // Convert minute of day to horizontal pixel offset on board
  const px = useCallback(
    (t: number, customTx = tx, customScale = scale) => {
      return customTx + (t - T0) * customScale;
    },
    [tx, scale, T0]
  );

  // Clamp horizontal offset tx within canvas bounds
  const clampTx = useCallback(
    (targetTx: number, currentScale = scale) => {
      if (!vpRef.current) return targetTx;
      const w = vpRef.current.clientWidth;
      const span = (T1 - T0) * currentScale;
      if (span + labelWidth + 16 <= w) return labelWidth;
      return Math.max(w - span - 24, Math.min(labelWidth, targetTx));
    },
    [scale, T0, T1, labelWidth]
  );

  // Fit schedule day neatly within viewport
  const fitDay = useCallback(() => {
    if (!vpRef.current) return;
    const w = vpRef.current.clientWidth;
    const nextScale = Math.max(1.3, (w - labelWidth - 24) / (T1 - T0));
    setScale(nextScale);
    setTx(labelWidth);
    setActiveTip(null);
  }, [labelWidth, T0, T1]);

  // Zoom canvas with anchor focal point
  const zoom = useCallback(
    (factor: number, focalX?: number) => {
      setScale((prevScale) => {
        const nextScale = Math.max(1.2, Math.min(6.5, prevScale * factor));
        setTx((prevTx) => {
          const cx = focalX ?? (vpRef.current ? vpRef.current.clientWidth / 2 : 300);
          const t = (cx - prevTx) / prevScale;
          const newTx = cx - t * nextScale;
          return clampTx(newTx, nextScale);
        });
        return nextScale;
      });
    },
    [clampTx]
  );

  // Fit day upon initial load of board mode
  useEffect(() => {
    if (viewMode === "board" && !loading && sessions.length > 0) {
      fitDay();
    }
  }, [viewMode, loading, sessions.length, fitDay]);

  // Wheel zoom / pan handling
  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, cx);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        setTx((prev) => clampTx(prev - e.deltaX, scale));
      }
    };

    vp.addEventListener("wheel", handleWheel, { passive: false });
    return () => vp.removeEventListener("wheel", handleWheel);
  }, [zoom, clampTx, scale]);

  // Pointer drag to pan & pinch to zoom
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".btn-tip-action")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    startXRef.current = e.clientX;
    startTxRef.current = tx;
    movedRef.current = false;

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchDistRef.current = Math.abs(pts[0].clientX - pts[1].clientX);
    }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Handle 2-finger pinch
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const d = Math.abs(pts[0].clientX - pts[1].clientX);
      if (pinchDistRef.current > 0 && vpRef.current) {
        const ratio = d / pinchDistRef.current;
        const midX =
          (pts[0].clientX + pts[1].clientX) / 2 - vpRef.current.getBoundingClientRect().left;
        zoom(ratio, midX);
      }
      pinchDistRef.current = d;
      movedRef.current = true;
      return;
    }

    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 4) {
      movedRef.current = true;
      setActiveTip(null);
      setTx(clampTx(startTxRef.current + dx, scale));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  // Anchored popover tooltip helper for session blocks (No blocking modal dialog!)
  const showBlockTip = (
    session: DisplayScheduleSession,
    blockEl: HTMLElement,
    laneIdx: number
  ) => {
    if (movedRef.current) return;
    if (hideTipTimeoutRef.current) clearTimeout(hideTipTimeoutRef.current);
    if (!stageRef.current) return;

    const stageRect = stageRef.current.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const left = Math.max(8, Math.min(blockRect.left - stageRect.left, stageRect.width - 290));

    // Place tip below block on top lanes, or above block on bottom lanes
    const isTopHalf = laneIdx < lanes.length / 2;
    setActiveTip({
      session,
      left,
      top: isTopHalf ? blockRect.bottom - stageRect.top + 6 : undefined,
      bottom: !isTopHalf ? stageRect.bottom - blockRect.top + 6 : undefined,
    });
  };

  const hideBlockTip = (immediate = false) => {
    if (hideTipTimeoutRef.current) clearTimeout(hideTipTimeoutRef.current);
    if (immediate) {
      setActiveTip(null);
    } else {
      hideTipTimeoutRef.current = setTimeout(() => {
        setActiveTip(null);
      }, 200);
    }
  };

  // Close tip on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTip(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Total calculated height of the interactive canvas viewport
  const viewportHeight = Math.max(340, RH + lanes.length * LH);

  return (
    <div className={cn("schedule-container space-y-4", className)}>
      {/* SCOPED COMPONENT STYLES (Matching the Meridian Canvas Schedule Reference) */}
      <style>{`
        .schedule-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: hsl(var(--muted)/0.35); border: 1px solid hsl(var(--border)/0.5); }
        .schedule-seg .btn-seg { font: inherit; font-size: 0.82rem; font-weight: 600; padding: 6px 16px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.15s ease; }
        .schedule-seg .btn-seg:hover { color: hsl(var(--foreground)); }
        .schedule-seg .btn-seg[aria-pressed="true"] { background: hsl(var(--card)); color: hsl(var(--foreground)); border-color: hsl(var(--border)); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        
        /* Board Mode Canvas */
        .schedule-stage { position: relative; }
        .schedule-vp {
          position: relative;
          border: 1px solid hsl(var(--border)/0.8);
          border-radius: 16px;
          background-color: hsl(var(--card)/0.4);
          overflow: hidden;
          cursor: grab;
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
          background-image: radial-gradient(circle, hsl(var(--muted-foreground)/0.25) 1px, transparent 1.2px);
          background-size: 24px 24px;
        }
        .schedule-vp.is-dragging { cursor: grabbing; }
        
        .schedule-ruler {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 40px;
          border-bottom: 1px solid hsl(var(--border)/0.8);
          background: hsl(var(--card)/0.95);
          backdrop-filter: blur(8px);
          z-index: 10;
        }
        .schedule-tick {
          position: absolute;
          top: 0;
          height: 40px;
          padding: 10px 0 0 8px;
          border-left: 1px solid hsl(var(--border)/0.7);
          font-size: 0.76rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: hsl(var(--foreground));
        }
        .schedule-tick.half {
          border-left-style: dashed;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
        }
        .schedule-grid {
          position: absolute;
          top: 40px;
          bottom: 0;
          border-left: 1px solid hsl(var(--border)/0.4);
          pointer-events: none;
        }
        .schedule-lane {
          position: absolute;
          left: 0;
          right: 0;
          height: 96px;
          border-bottom: 1px solid hsl(var(--border)/0.5);
        }
        .schedule-lane:last-child { border-bottom: 0; }
        .schedule-lbl {
          position: absolute;
          left: 0;
          z-index: 12;
          width: 112px;
          height: 96px;
          padding: 14px 10px;
          background: linear-gradient(90deg, hsl(var(--card)) 75%, transparent);
          font-size: 0.8rem;
          font-weight: 700;
          pointer-events: none;
          color: hsl(var(--foreground));
        }
        @media (max-width: 640px) {
          .schedule-lbl { width: 84px; font-size: 0.74rem; }
        }
        .schedule-lbl span {
          display: block;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          font-size: 0.72rem;
          margin-top: 2px;
        }
        
        /* Canvas Session Blocks */
        .schedule-blk {
          position: absolute;
          height: 72px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card)/0.85);
          backdrop-filter: blur(4px);
          text-align: left;
          color: hsl(var(--foreground));
          cursor: pointer;
          overflow: hidden;
          z-index: 5;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .schedule-blk b {
          display: block;
          font-size: 0.82rem;
          line-height: 1.25;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .schedule-blk i {
          display: block;
          font-style: normal;
          font-size: 0.72rem;
          color: hsl(var(--muted-foreground));
          font-variant-numeric: tabular-nums;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
        }
        .schedule-blk.Talk { background: hsl(var(--card)/0.9); border-color: hsl(var(--border)/0.9); }
        .schedule-blk.Keynote, .schedule-blk.Plenary { background: rgba(255,153,0,0.12); border-color: rgba(255,153,0,0.35); }
        .schedule-blk.Workshop { border-color: rgba(255,153,0,0.6); background: hsl(var(--card)); }
        .schedule-blk.Service, .schedule-blk.Break, .schedule-blk.Networking { border-style: dashed; background: hsl(var(--muted)/0.2); }
        .schedule-blk:hover, .schedule-blk.is-active {
          transform: translateY(-2px);
          border-color: #FF9900;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          z-index: 15;
        }
        .schedule-blk.is-saved::after {
          content: "";
          position: absolute;
          top: 8px;
          right: 8px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #FF9900;
          box-shadow: 0 0 6px rgba(255,153,0,0.7);
        }
        
        /* Anchored Popover Tip (No Blocking Modal!) */
        .schedule-tip {
          position: absolute;
          z-index: 30;
          width: 290px;
          padding: 16px;
          border-radius: 14px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 16px 36px rgba(0,0,0,0.45);
          font-size: 0.84rem;
        }
        .schedule-tip h3 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.3;
          color: hsl(var(--foreground));
        }
        .schedule-tip .when {
          color: #FF9900;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          font-size: 0.8rem;
          margin-bottom: 8px;
        }
        .schedule-tip p {
          margin: 0 0 8px;
          color: hsl(var(--muted-foreground));
          line-height: 1.4;
          font-size: 0.8rem;
        }
        .schedule-tip .who {
          font-weight: 600;
          color: hsl(var(--foreground));
          margin-bottom: 8px;
        }
        .schedule-tip .loc {
          font-size: 0.78rem;
          color: hsl(var(--muted-foreground));
          margin-bottom: 12px;
        }
        
        /* List Mode (Clean Minimalist Accordion) */
        .schedule-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .schedule-li {
          border-bottom: 1px solid hsl(var(--border)/0.6);
          transition: background-color 0.2s ease, border-radius 0.2s ease;
        }
        .schedule-hd {
          all: unset;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 62px 1fr 20px;
          gap: 12px;
          width: 100%;
          min-height: 64px;
          padding: 14px 4px;
          cursor: pointer;
          align-items: start;
          -webkit-tap-highlight-color: transparent;
        }
        .schedule-hd:focus-visible {
          outline: 2px solid #FF9900;
          outline-offset: 2px;
          border-radius: 8px;
        }
        .schedule-li .tm {
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          font-size: 0.95rem;
          letter-spacing: -0.01em;
          color: hsl(var(--foreground));
        }
        .schedule-li .tm small {
          display: block;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          font-size: 0.72rem;
          margin-top: 2px;
        }
        .schedule-li .tt {
          font-weight: 700;
          font-size: 0.96rem;
          line-height: 1.35;
          letter-spacing: -0.01em;
          color: hsl(var(--foreground));
        }
        .schedule-li .sv-dot {
          display: none;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #FF9900;
          margin-left: 8px;
          vertical-align: middle;
        }
        .schedule-li.is-saved .sv-dot { display: inline-block; }
        .schedule-li .rm {
          color: hsl(var(--muted-foreground));
          font-size: 0.8rem;
          margin-top: 3px;
        }
        .schedule-li .rm b {
          font-weight: 600;
          color: #FF9900;
        }
        .schedule-li .chev {
          width: 9px;
          height: 9px;
          margin-top: 8px;
          border-right: 2px solid hsl(var(--muted-foreground));
          border-bottom: 2px solid hsl(var(--muted-foreground));
          transform: rotate(45deg);
          transition: transform 0.22s ease, margin-top 0.22s ease;
        }
        .schedule-li.is-open .chev {
          transform: rotate(-135deg);
          margin-top: 12px;
          border-color: #FF9900;
        }
        .schedule-li.is-open {
          background: linear-gradient(90deg, rgba(255,153,0,0.08), transparent 65%);
          border-radius: 12px;
        }
        
        /* Smooth CSS Grid Accordion Transition */
        .schedule-dt {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.26s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .schedule-li.is-open .schedule-dt {
          grid-template-rows: 1fr;
        }
        .schedule-dt > div {
          overflow: hidden;
        }
        .schedule-in {
          padding: 0 4px 18px 74px;
          font-size: 0.88rem;
        }
        @media (max-width: 600px) {
          .schedule-in { padding-left: 4px; }
        }
      `}</style>

      {/* TOP CONTROLS & UNIFIED TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60">
        {/* Left: Exactly 2 View Modes (Board vs List) */}
        <div className="flex items-center gap-2">
          <div className="schedule-seg" role="group" aria-label="Choose schedule view">
            <button
              type="button"
              className="btn-seg"
              aria-pressed={viewMode === "board"}
              onClick={() => {
                setUserPickedView(true);
                setViewMode("board");
                hideBlockTip(true);
              }}
            >
              Board
            </button>
            <button
              type="button"
              className="btn-seg"
              aria-pressed={viewMode === "list"}
              onClick={() => {
                setUserPickedView(true);
                setViewMode("list");
                hideBlockTip(true);
              }}
            >
              List
            </button>
          </div>

          {/* Quick Track Filter Pills */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none pl-1">
            <button
              type="button"
              onClick={() => {
                setSelectedRoom("ALL");
                setOnlySaved(false);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
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
                  "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  selectedRoom === room && !onlySaved
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {room}
              </button>
            ))}

            {/* Bookmarked / Saved Shortcut Pill */}
            <button
              type="button"
              onClick={() => setOnlySaved((prev) => !prev)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer border",
                onlySaved
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
              )}
              title="Show bookmarked talks"
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
        </div>

        {/* Right: Search & Bulk Export */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search talks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-background/60 border-border/60 focus:border-orange-500/50"
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
            className="h-8 text-xs font-medium cursor-pointer shrink-0"
            title="Download iCalendar file (.ics)"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-orange-400" />
            <span>.ICS</span>
          </Button>
        </div>
      </div>

      {/* FILTER ACTIVE STATUS BAR */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
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
          <p className="text-xs text-muted-foreground animate-pulse">Loading event schedule...</p>
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
              : "Try adjusting your search query or track filter."}
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
        <div className="space-y-4">
          {/* ============================================================ */}
          {/* MODE 1: BOARD VIEW (Horizontal Canvas Schedule Board)       */}
          {/* ============================================================ */}
          {viewMode === "board" && (
            <div className="space-y-3">
              {/* Board Controls Toolbar */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => zoom(1 / 1.35)}
                  className="h-8 text-xs cursor-pointer"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5 mr-1" />
                  Zoom out
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => zoom(1.35)}
                  className="h-8 text-xs cursor-pointer"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5 mr-1" />
                  Zoom in
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fitDay}
                  className="h-8 text-xs cursor-pointer"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Fit day
                </Button>
                <span className="text-[11px] text-muted-foreground/80 sm:ml-auto">
                  Drag to pan. Hold Ctrl/Cmd and scroll to zoom. Times in WIB.
                </span>
              </div>

              {/* Board Interactive Stage */}
              <div className="schedule-stage" ref={stageRef}>
                <div
                  ref={vpRef}
                  className={cn("schedule-vp", isDragging && "is-dragging")}
                  style={{
                    height: `${viewportHeight}px`,
                    backgroundPosition: `${tx % 24}px 0, ${tx % 24}px 0`,
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  role="region"
                  aria-label="Interactive event schedule board"
                >
                  {/* Top Time Ruler */}
                  <div className="schedule-ruler">
                    {ticks.map((t) => (
                      <div
                        key={t.min}
                        className={cn("schedule-tick", t.isHalf && "half")}
                        style={{ left: `${px(t.min)}px` }}
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>

                  {/* Vertical Time Grid Lines */}
                  {ticks.map((t) => (
                    <div
                      key={`grid-${t.min}`}
                      className="schedule-grid"
                      style={{ left: `${px(t.min)}px` }}
                    />
                  ))}

                  {/* Room Track Lanes & Left Labels */}
                  {lanes.map((lane, i) => (
                    <React.Fragment key={lane.id}>
                      <div
                        className="schedule-lane"
                        style={{ top: `${RH + i * LH}px` }}
                      />
                      <div
                        className="schedule-lbl"
                        style={{ top: `${RH + i * LH}px` }}
                      >
                        {lane.name}
                        <span>{lane.subtitle}</span>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Positioned Session Blocks */}
                  {filteredSessions.map((session) => {
                    const startMin = parseMinutesOfDay(session.startsAt) ?? T0;
                    const endMin = parseMinutesOfDay(session.endsAt) ?? startMin + 45;
                    const duration = Math.max(15, endMin - startMin);
                    const laneIdx = sessionLaneMap.get(session.id) ?? 0;
                    const isSaved = savedSessionIds.includes(session.id);
                    const isActive = activeTip?.session.id === session.id;

                    const blockLeft = px(startMin) + 2;
                    const blockWidth = Math.max(60, duration * scale - 4);
                    const blockTop = RH + laneIdx * LH;

                    const formatClass = session.sessionType || (session.isServiceSession ? "Service" : "Talk");

                    return (
                      <button
                        key={session.id}
                        type="button"
                        className={cn(
                          "schedule-blk",
                          formatClass,
                          isSaved && "is-saved",
                          isActive && "is-active"
                        )}
                        style={{
                          top: `${blockTop}px`,
                          left: `${blockLeft}px`,
                          width: `${blockWidth}px`,
                        }}
                        onMouseEnter={(e) => showBlockTip(session, e.currentTarget, laneIdx)}
                        onMouseLeave={() => hideBlockTip(false)}
                        onFocus={(e) => showBlockTip(session, e.currentTarget, laneIdx)}
                        onClick={(e) => {
                          if (movedRef.current) return;
                          showBlockTip(session, e.currentTarget, laneIdx);
                        }}
                        aria-label={`${session.title}, ${formatTimeShort(session.startsAt)} to ${formatTimeShort(session.endsAt)}`}
                      >
                        <b>{session.title}</b>
                        <i>
                          {formatTimeShort(session.startsAt)} – {formatTimeShort(session.endsAt)} WIB
                        </i>
                      </button>
                    );
                  })}
                </div>

                {/* Floating Anchored Popover Tip (No Blocking Modal!) */}
                {activeTip && (
                  <div
                    className="schedule-tip"
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
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3>{activeTip.session.title}</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTip(null)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer -mt-0.5 -mr-1 p-1"
                        aria-label="Close details"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="when">
                      {formatTime(activeTip.session.startsAt, activeTip.session.endsAt)}
                    </div>

                    {activeTip.session.description && (
                      <p className="line-clamp-3">{activeTip.session.description}</p>
                    )}

                    {activeTip.session.speakers.length > 0 && (
                      <p className="who">
                        {activeTip.session.speakers.map((s) => s.name).join(", ")}
                        {activeTip.session.speakers[0]?.company && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            ({activeTip.session.speakers[0].company})
                          </span>
                        )}
                      </p>
                    )}

                    <div className="loc">
                      Where: <strong>{roomLabelOf(activeTip.session) || "Main Hall"}</strong>
                    </div>

                    {/* Action buttons inside floating tip */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/50">
                      <Button
                        type="button"
                        variant={savedSessionIds.includes(activeTip.session.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBookmark(activeTip.session.id)}
                        className={cn(
                          "btn-tip-action h-7 px-2.5 text-xs font-semibold cursor-pointer",
                          savedSessionIds.includes(activeTip.session.id)
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : ""
                        )}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3 mr-1",
                            savedSessionIds.includes(activeTip.session.id) ? "fill-white" : ""
                          )}
                        />
                        {savedSessionIds.includes(activeTip.session.id) ? "Saved" : "Save"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="btn-tip-action h-7 px-2.5 text-xs font-medium cursor-pointer"
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
                        className="btn-tip-action h-7 px-2.5 text-xs font-medium cursor-pointer"
                      >
                        <Download className="h-3 w-3 mr-1 text-orange-400" />
                        .ICS
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend matching reference HTML */}
              <div className="flex items-center gap-4.5 flex-wrap text-xs text-muted-foreground pt-1 px-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-orange-500/20 border border-orange-500/40"></span>
                  Keynote & Plenary
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-card border border-border"></span>
                  Breakout Session
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border border-orange-500/60 bg-card"></span>
                  Workshop
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border border-dashed border-border/80 bg-muted/20"></span>
                  Rundown & Breaks
                </span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE 2: LIST VIEW (Mobile-Friendly Minimal Accordion)         */}
          {/* ============================================================ */}
          {viewMode === "list" && (
            <ol className="schedule-list">
              {filteredSessions.map((session) => {
                const isSaved = savedSessionIds.includes(session.id);
                const isOpen = expandedSessionIds[session.id] || false;
                const durationMin = getDurationMinutes(session.startsAt, session.endsAt);
                const startTimeStr = formatTimeShort(session.startsAt);
                const durationOrEnd = durationMin
                  ? formatDuration(durationMin)
                  : formatTimeShort(session.endsAt);

                return (
                  <li
                    key={session.id}
                    className={cn(
                      "schedule-li",
                      isOpen && "is-open",
                      isSaved && "is-saved"
                    )}
                  >
                    {/* Minimalist 3-Column Header (62px Time | Title + Room | Chevron) */}
                    <button
                      type="button"
                      className="schedule-hd"
                      aria-expanded={isOpen}
                      aria-controls={`dt-${session.id}`}
                      onClick={() => toggleExpand(session.id)}
                    >
                      {/* Col 1: Time */}
                      <div className="tm">
                        {startTimeStr}
                        <small>{durationOrEnd}</small>
                      </div>

                      {/* Col 2: Title, Room, Category */}
                      <div>
                        <div className="tt">
                          {session.title}
                          <span className="sv-dot" />
                        </div>
                        <div className="rm">
                          {roomLabelOf(session) || "Main Stage"},{" "}
                          <b>
                            {session.sessionType ||
                              (session.isServiceSession ? "Rundown" : "Talk")}
                          </b>
                          {session.speakers.length > 0 && (
                            <span className="text-muted-foreground/80">
                              {" "}
                              • {session.speakers.map((s) => s.name).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Col 3: Chevron */}
                      <span className="chev" aria-hidden="true" />
                    </button>

                    {/* Smooth In-Place Detail Expansion (No Modal Dialog!) */}
                    <div className="schedule-dt" id={`dt-${session.id}`}>
                      <div>
                        <div className="schedule-in space-y-3.5">
                          {/* Overview / Description */}
                          {session.description && (
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                              {session.description}
                            </p>
                          )}

                          {/* Speaker Spotlight */}
                          {session.speakers.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-border/40">
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

                          {/* Time, Venue & Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="font-mono text-muted-foreground">
                              {formatTime(session.startsAt, session.endsAt)}
                            </span>
                            {roomLabelOf(session) && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-foreground border border-border/40">
                                {roomLabelOf(session)}
                              </span>
                            )}
                            {session.languages.map((l) => (
                              <span
                                key={l}
                                className="px-2 py-0.5 rounded-md text-[10px] bg-muted/40 text-muted-foreground border border-border/30 flex items-center gap-1"
                              >
                                <Globe className="h-2.5 w-2.5 text-orange-400" />
                                <span>{l}</span>
                              </span>
                            ))}
                            {session.levels.map((lvl) => (
                              <span
                                key={lvl}
                                className="px-2 py-0.5 rounded-md text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"
                              >
                                <Gauge className="h-2.5 w-2.5 text-purple-400" />
                                <span>{lvl}</span>
                              </span>
                            ))}
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
                            <Button
                              type="button"
                              variant={isSaved ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => toggleBookmark(session.id, e)}
                              className={cn(
                                "h-8 text-xs font-semibold cursor-pointer",
                                isSaved ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-3.5 w-3.5 mr-1.5",
                                  isSaved ? "fill-white text-white" : ""
                                )}
                              />
                              {isSaved ? "Saved" : "Save session"}
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
                              className="h-8 text-xs font-medium cursor-pointer"
                            >
                              <Download className="h-3 w-3 mr-1 text-orange-400" />
                              Download .ICS
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// Preserve Astro React client renderer symbol
(ComDaySchedule as unknown as Record<symbol, string>)[Symbol.for("astro:renderer")] =
  "@astrojs/react";
