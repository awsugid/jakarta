import {
  parseMinutesOfDay,
  type DisplayScheduleSession,
} from "@/components/community-day/schedule-calendar-helpers";
import type { EventScheduleItem } from "@/lib/types";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";

/** Formats time range in Asia/Jakarta (WIB), e.g. "14:05 – 16:05 WIB" */
export function formatTimeRangeWib(
  startsAt?: string | null,
  endsAt?: string | null
): string {
  if (!startsAt) return "Time TBA";
  try {
    const s = new Date(startsAt);
    const startStr = s.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    if (!endsAt) return `${startStr} WIB`;
    const e = new Date(endsAt);
    const endStr = e.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    return `${startStr} – ${endStr} WIB`;
  } catch {
    return startsAt;
  }
}

/** Formats date to 24h clock string HH:mm:ss in Asia/Jakarta (WIB) */
export function formatWibClock(date: Date): string {
  try {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return "";
  }
}

/** Formats date to short HH:mm in Asia/Jakarta (WIB) */
export function formatWibShortTime(date: Date): string {
  try {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return "";
  }
}

/** Formats minutes of day (e.g. 845 -> "14:05") */
export function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Parses HH:mm string on a base ISO date to Date object in WIB */
export function parseDemoTimeToDate(
  demoTimeStr: string,
  baseDateIso: string = "2026-10-31T00:00:00+07:00"
): Date | null {
  const match = demoTimeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const hStr = hours.toString().padStart(2, "0");
  const mStr = minutes.toString().padStart(2, "0");
  return new Date(`2026-10-31T${hStr}:${mStr}:00+07:00`);
}

/** Calculates minutes remaining until target */
export function getMinutesRemaining(targetDate: Date, now: Date): number {
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
}

export interface ShortSessionMeta {
  icon: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
}

export interface ShortSessionDisplayInfo {
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  primaryLabel: string;
  speakerName?: string;
  fullTitle: string;
}

/** Returns presentation metadata (icon, short label, theme colors) for short operational sessions */
export function getShortSessionMeta(title: string): ShortSessionMeta {
  const t = (title || "").toLowerCase();
  if (t.includes("kahoot") || t.includes("ice breaking")) {
    return {
      icon: "🎮",
      shortLabel: "Kahoot",
      badgeBg: "bg-amber-950/80 hover:bg-amber-900/90",
      badgeBorder: "border-amber-500/50 hover:border-amber-400",
      textColor: "text-amber-200",
    };
  }
  if (t.includes("documentation") || t.includes("photo")) {
    return {
      icon: "📸",
      shortLabel: "Photo",
      badgeBg: "bg-blue-950/80 hover:bg-blue-900/90",
      badgeBorder: "border-blue-500/50 hover:border-blue-400",
      textColor: "text-blue-200",
    };
  }
  if (t.includes("split stage")) {
    return {
      icon: "🔀",
      shortLabel: "Split Stage",
      badgeBg: "bg-cyan-950/80 hover:bg-cyan-900/90",
      badgeBorder: "border-cyan-500/50 hover:border-cyan-400",
      textColor: "text-cyan-200",
    };
  }
  if (t.includes("merge stage")) {
    return {
      icon: "🔁",
      shortLabel: "Merge Stage",
      badgeBg: "bg-indigo-950/80 hover:bg-indigo-900/90",
      badgeBorder: "border-indigo-500/50 hover:border-indigo-400",
      textColor: "text-indigo-200",
    };
  }
  if (t.includes("opening")) {
    return {
      icon: "🚀",
      shortLabel: "Opening",
      badgeBg: "bg-purple-950/80 hover:bg-purple-900/90",
      badgeBorder: "border-purple-500/50 hover:border-purple-400",
      textColor: "text-purple-200",
    };
  }
  if (t.includes("closing")) {
    return {
      icon: "🏁",
      shortLabel: "Closing",
      badgeBg: "bg-rose-950/80 hover:bg-rose-900/90",
      badgeBorder: "border-rose-500/50 hover:border-rose-400",
      textColor: "text-rose-200",
    };
  }
  if (t.includes("feedback")) {
    return {
      icon: "📝",
      shortLabel: "Feedback",
      badgeBg: "bg-emerald-950/80 hover:bg-emerald-900/90",
      badgeBorder: "border-emerald-500/50 hover:border-emerald-400",
      textColor: "text-emerald-200",
    };
  }
  if (t.includes("networking")) {
    return {
      icon: "🤝",
      shortLabel: "Networking",
      badgeBg: "bg-teal-950/80 hover:bg-teal-900/90",
      badgeBorder: "border-teal-500/50 hover:border-teal-400",
      textColor: "text-teal-200",
    };
  }
  if (t.includes("speech") || t.includes("welcoming")) {
    return {
      icon: "🎤",
      shortLabel: "Welcome",
      badgeBg: "bg-amber-950/70 hover:bg-amber-900/80",
      badgeBorder: "border-amber-500/40 hover:border-amber-300",
      textColor: "text-amber-200",
    };
  }
  return {
    icon: "⚡",
    shortLabel: "Session",
    badgeBg: "bg-slate-900/90 hover:bg-slate-800",
    badgeBorder: "border-slate-700/60 hover:border-slate-500",
    textColor: "text-slate-200",
  };
}

/** Formats crisp, readable labels for short sessions without truncating or hyphenating */
export function getShortSessionDisplayInfo(session: DisplayScheduleSession): ShortSessionDisplayInfo {
  const title = session.title || "";
  const t = title.toLowerCase();
  const rawSpeaker = session.speakers?.[0]?.name || session.speakerName || "";
  const speakerName = rawSpeaker ? rawSpeaker.split(",")[0].trim() : undefined;

  // 1. Welcoming Speeches (e.g. AWS UG Jakarta, AWS, Binus)
  if (t.includes("welcoming speech") || t.includes("welcome")) {
    let org = "";
    if (t.includes("user group") || t.includes("aws ug") || t.includes("aws user group")) {
      org = "AWS UG Jakarta";
    } else if (t.includes("binus")) {
      org = "Binus University";
    } else if (t.includes("aws representative") || t.includes("aws")) {
      org = "AWS Representative";
    } else {
      const parts = title.split("-");
      org = parts.length > 1 ? parts[1].trim() : "Welcome";
    }

    return {
      icon: "🎤",
      badgeBg: "bg-amber-950/85 hover:bg-amber-900",
      badgeBorder: "border-amber-500/50 hover:border-amber-400",
      textColor: "text-amber-200",
      primaryLabel: org,
      speakerName: speakerName,
      fullTitle: title,
    };
  }

  // 2. Ice Breaking / Kahoot
  if (t.includes("kahoot") || t.includes("ice breaking")) {
    return {
      icon: "🎮",
      badgeBg: "bg-amber-950/85 hover:bg-amber-900",
      badgeBorder: "border-amber-500/50 hover:border-amber-400",
      textColor: "text-amber-200",
      primaryLabel: "Ice Breaking: Kahoot",
      speakerName: speakerName || "Interactive Quiz",
      fullTitle: title,
    };
  }

  // 3. Documentation / Photo
  if (t.includes("documentation") || t.includes("photo")) {
    return {
      icon: "📸",
      badgeBg: "bg-blue-950/85 hover:bg-blue-900",
      badgeBorder: "border-blue-500/50 hover:border-blue-400",
      textColor: "text-blue-200",
      primaryLabel: "Documentation",
      speakerName: speakerName || "Group Photo Session",
      fullTitle: title,
    };
  }

  // 4. Split Stage
  if (t.includes("split stage")) {
    return {
      icon: "🔀",
      badgeBg: "bg-cyan-950/85 hover:bg-cyan-900",
      badgeBorder: "border-cyan-500/50 hover:border-cyan-400",
      textColor: "text-cyan-200",
      primaryLabel: "Split Stage",
      speakerName: speakerName || "Move to Classrooms",
      fullTitle: title,
    };
  }

  // 5. Merge Stage
  if (t.includes("merge stage")) {
    return {
      icon: "🔁",
      badgeBg: "bg-indigo-950/85 hover:bg-indigo-900",
      badgeBorder: "border-indigo-500/50 hover:border-indigo-400",
      textColor: "text-indigo-200",
      primaryLabel: "Merge Stage",
      speakerName: speakerName || "Return to Aula 800",
      fullTitle: title,
    };
  }

  // 6. Feedback Form
  if (t.includes("feedback")) {
    return {
      icon: "📝",
      badgeBg: "bg-emerald-950/85 hover:bg-emerald-900",
      badgeBorder: "border-emerald-500/50 hover:border-emerald-400",
      textColor: "text-emerald-200",
      primaryLabel: "Feedback Form",
      speakerName: speakerName || "Survey & Swags",
      fullTitle: title,
    };
  }

  // 7. Closing
  if (t.includes("closing")) {
    return {
      icon: "🏁",
      badgeBg: "bg-rose-950/85 hover:bg-rose-900",
      badgeBorder: "border-rose-500/50 hover:border-rose-400",
      textColor: "text-rose-200",
      primaryLabel: "Closing Remarks",
      speakerName: speakerName || "Event Wrap-Up",
      fullTitle: title,
    };
  }

  // 8. Networking
  if (t.includes("networking")) {
    return {
      icon: "🤝",
      badgeBg: "bg-teal-950/85 hover:bg-teal-900",
      badgeBorder: "border-teal-500/50 hover:border-teal-400",
      textColor: "text-teal-200",
      primaryLabel: "Networking",
      speakerName: speakerName || "Community Mingling",
      fullTitle: title,
    };
  }

  // 9. Generic Fallback
  return {
    icon: "⚡",
    badgeBg: "bg-slate-900/90 hover:bg-slate-800",
    badgeBorder: "border-slate-700/60 hover:border-slate-500",
    textColor: "text-slate-200",
    primaryLabel: title,
    speakerName: speakerName,
    fullTitle: title,
  };
}

export interface LaneItemLayout {
  laneIdx: number;
  blockLeft: number;
  blockWidth: number;
  blockTop: number;
  blockHeight: number;
  tier: number;
  isShort: boolean;
  durationMin: number;
  displayInfo: ShortSessionDisplayInfo;
  isCompact: boolean;
  isUltraCompact: boolean;
}

/**
 * Computes deterministic, non-colliding layout coordinates for all non-plenary sessions in a lane.
 * Short operational/welcoming sessions are grouped into multi-tier subrows spanning the full available time window
 * so that their titles and speakers are completely legible without requiring hover.
 */
export function computeLaneSessionLayouts(
  laneSessions: DisplayScheduleSession[],
  laneIdx: number,
  laneTop: number,
  laneHeight: number,
  labelWidth: number,
  T0: number,
  scale: number
): Map<string, LaneItemLayout> {
  const result = new Map<string, LaneItemLayout>();
  if (laneSessions.length === 0) return result;

  // 1. Sort sessions ascending by start time
  const sorted = [...laneSessions].sort((a, b) => {
    const aStart = parseMinutesOfDay(a.startsAt) ?? 0;
    const bStart = parseMinutesOfDay(b.startsAt) ?? 0;
    return aStart - bStart;
  });

  // 2. Identify segments (regular talk vs short session cluster)
  type Segment =
    | { type: "regular"; session: DisplayScheduleSession; startMin: number; endMin: number; durationMin: number }
    | { type: "shortCluster"; sessions: DisplayScheduleSession[]; startMin: number; endMin: number };

  const segments: Segment[] = [];
  let currentShortCluster: DisplayScheduleSession[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const sStart = parseMinutesOfDay(s.startsAt) ?? T0;
    const sEnd = parseMinutesOfDay(s.endsAt) ?? sStart + 30;
    const sDur = Math.max(1, sEnd - sStart);
    const isShort = sDur <= 20;

    if (isShort) {
      currentShortCluster.push(s);
    } else {
      if (currentShortCluster.length > 0) {
        const cStart = parseMinutesOfDay(currentShortCluster[0].startsAt) ?? T0;
        const cEnd = parseMinutesOfDay(currentShortCluster[currentShortCluster.length - 1].endsAt) ?? cStart + 15;
        segments.push({
          type: "shortCluster",
          sessions: currentShortCluster,
          startMin: cStart,
          endMin: cEnd,
        });
        currentShortCluster = [];
      }
      segments.push({
        type: "regular",
        session: s,
        startMin: sStart,
        endMin: sEnd,
        durationMin: sDur,
      });
    }
  }

  if (currentShortCluster.length > 0) {
    const cStart = parseMinutesOfDay(currentShortCluster[0].startsAt) ?? T0;
    const cEnd = parseMinutesOfDay(currentShortCluster[currentShortCluster.length - 1].endsAt) ?? cStart + 15;
    segments.push({
      type: "shortCluster",
      sessions: currentShortCluster,
      startMin: cStart,
      endMin: cEnd,
    });
  }

  // 3. Compute layout bounds for each segment
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx];
    const nextSeg = segments[segIdx + 1];
    const nextLimitMin = nextSeg ? nextSeg.startMin : null;

    if (seg.type === "regular") {
      const { session, startMin, endMin, durationMin } = seg;
      const blockLeft = labelWidth + (startMin - T0) * scale + 2;
      const naturalWidth = durationMin * scale - 4;
      const maxAvailableWidth =
        nextLimitMin !== null && nextLimitMin > startMin
          ? (nextLimitMin - startMin) * scale - 4
          : naturalWidth;

      const blockWidth = Math.max(20, Math.min(naturalWidth, maxAvailableWidth));
      const blockTop = laneTop + 6;
      const blockHeight = laneHeight - 12;

      result.set(session.id, {
        laneIdx,
        blockLeft,
        blockWidth,
        blockTop,
        blockHeight,
        tier: 0,
        isShort: false,
        durationMin,
        displayInfo: getShortSessionDisplayInfo(session),
        isCompact: blockWidth < 80,
        isUltraCompact: blockWidth < 28,
      });
    } else {
      // Short Cluster handling
      const cluster = seg.sessions;
      const clusterStart =
        segIdx === 0 && seg.startMin <= T0 + 10 && seg.startMin >= T0 ? T0 : seg.startMin;
      const clusterEnd = nextLimitMin !== null && nextLimitMin > clusterStart ? nextLimitMin : seg.endMin;
      const totalClusterSpan = Math.max(10, clusterEnd - clusterStart);

      // Helper to lay out a group of sessions across subrows in a given time span
      const layoutGroup = (
        groupSessions: DisplayScheduleSession[],
        grpStartMin: number,
        grpEndMin: number
      ) => {
        const numSub = Math.min(3, Math.max(1, groupSessions.length));
        const grpSpan = Math.max(8, grpEndMin - grpStartMin);
        const subRowH = Math.floor((laneHeight - 12 - (numSub - 1) * 4) / numSub);
        const grpBlockLeft = labelWidth + (grpStartMin - T0) * scale + 2;
        const grpBlockWidth = Math.max(24, grpSpan * scale - 4);

        for (let i = 0; i < groupSessions.length; i++) {
          const s = groupSessions[i];
          const sStart = parseMinutesOfDay(s.startsAt) ?? grpStartMin;
          const sEnd = parseMinutesOfDay(s.endsAt) ?? sStart + 5;
          const sDur = Math.max(1, sEnd - sStart);
          const subIdx = i % numSub;

          const blockTop = laneTop + 6 + subIdx * (subRowH + 4);
          const blockHeight = subRowH;

          result.set(s.id, {
            laneIdx,
            blockLeft: grpBlockLeft,
            blockWidth: grpBlockWidth,
            blockTop,
            blockHeight,
            tier: subIdx + 1,
            isShort: true,
            durationMin: sDur,
            displayInfo: getShortSessionDisplayInfo(s),
            isCompact: grpBlockWidth < 80,
            isUltraCompact: grpBlockWidth < 28,
          });
        }
      };

      if (cluster.length <= 3) {
        layoutGroup(cluster, clusterStart, clusterEnd);
      } else {
        // More than 3 sessions (e.g. 16:20 - 17:00 wrap-up cluster)
        // Divide at midpoint (e.g. 16:20-16:35 and 16:35-17:00)
        const midIdx = Math.ceil(cluster.length / 2);
        const group1 = cluster.slice(0, midIdx);
        const group2 = cluster.slice(midIdx);

        const midMin = parseMinutesOfDay(group2[0].startsAt) ?? (clusterStart + Math.floor(totalClusterSpan / 2));
        layoutGroup(group1, clusterStart, midMin);
        layoutGroup(group2, midMin, clusterEnd);
      }
    }
  }

  return result;
}

/** Check if session is a plenary (all-hands) conference session */
export function isPlenarySession(s: DisplayScheduleSession): boolean {
  if (s.allRooms) return true;
  if (s.room === "All Rooms") return true;

  const room = (s.room || s.rooms?.[0] || "").toLowerCase();
  const track = (s.track || "").toLowerCase();

  // Breakout classrooms are NEVER plenary sessions
  if (
    room.includes("804") ||
    room.includes("806") ||
    room.includes("810") ||
    track.includes("classroom")
  ) {
    return false;
  }

  const title = (s.title || "").toLowerCase();
  if (
    title.includes("open gate") ||
    title.includes("closing") ||
    title.includes("keynote") ||
    (title.includes("opening") && (room.includes("800") || room.includes("atrium") || track.includes("main")))
  ) {
    return true;
  }
  return false;
}

/** Filter sessions by room (includes plenary sessions like Open Gate, Keynote, Closing) */
export function filterSessionsByRoom(
  sessions: DisplayScheduleSession[],
  selectedRoom: string
): DisplayScheduleSession[] {
  if (!selectedRoom || selectedRoom === "ALL") return sessions;

  return sessions.filter((s) => {
    if (isPlenarySession(s)) return true;
    const rLower = selectedRoom.toLowerCase();
    if (s.room && (s.room.toLowerCase() === rLower || s.room.toLowerCase().includes(rLower))) {
      return true;
    }
    if (s.rooms && s.rooms.some((r) => r.toLowerCase() === rLower || r.toLowerCase().includes(rLower))) {
      return true;
    }
    if (s.track && s.track.toLowerCase().includes(rLower)) {
      return true;
    }
    return false;
  });
}

/**
 * Resolves active session, upcoming session, next preview sessions, and conference phase.
 */
export function resolveActiveSession(
  sessions: DisplayScheduleSession[],
  currentDate: Date,
  selectedRoom: string = "ALL"
): {
  activeSessions: DisplayScheduleSession[];
  currentSession: DisplayScheduleSession | null;
  upcomingSession: DisplayScheduleSession | null;
  nextSessions: DisplayScheduleSession[];
  isPreEvent: boolean;
  isPostEvent: boolean;
} {
  const filtered = filterSessionsByRoom(sessions, selectedRoom);
  const nowMs = currentDate.getTime();

  // Find all currently active sessions where startsAt <= now < endsAt
  const activeSessions = filtered.filter((s) => {
    if (!s.startsAt || !s.endsAt) return false;
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.endsAt).getTime();
    return nowMs >= start && nowMs < end;
  });

  let current: DisplayScheduleSession | null = null;
  if (activeSessions.length > 0) {
    if (selectedRoom !== "ALL") {
      // Prioritize room-specific session over general plenary if both exist
      current =
        activeSessions.find((s) => !isPlenarySession(s)) ||
        activeSessions[0];
    } else {
      // In "ALL" mode, if a widespread service session (like Lunch) is active, prioritize it
      const lunchOrService = activeSessions.find(
        (s) => s.isServiceSession && (s.title || "").toLowerCase().includes("lunch")
      );
      current = lunchOrService || activeSessions[0];
    }
  }

  // Upcoming sessions where startsAt > now
  const upcoming = filtered
    .filter((s) => s.startsAt && new Date(s.startsAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());

  // Check event boundaries
  const allWithStarts = filtered
    .filter((s) => s.startsAt)
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());

  const firstStart = allWithStarts[0]?.startsAt
    ? new Date(allWithStarts[0].startsAt).getTime()
    : null;

  const allWithEnds = filtered
    .filter((s) => s.endsAt)
    .sort((a, b) => new Date(b.endsAt!).getTime() - new Date(a.endsAt!).getTime());

  const lastEnd = allWithEnds[0]?.endsAt
    ? new Date(allWithEnds[0].endsAt).getTime()
    : null;

  const isPreEvent = Boolean(firstStart && nowMs < firstStart && !current);
  const isPostEvent = Boolean(lastEnd && nowMs >= lastEnd && !current);

  return {
    activeSessions,
    currentSession: current,
    upcomingSession: upcoming[0] || null,
    nextSessions: upcoming.slice(0, 3),
    isPreEvent,
    isPostEvent,
  };
}

/**
 * Converts raw EventScheduleItem[] into DisplayScheduleSession[]
 */
export function mapEventItemsToDisplaySessions(
  items: EventScheduleItem[]
): DisplayScheduleSession[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    room: item.room,
    rooms: item.rooms ?? [],
    allRooms: Boolean(item.allRooms),
    track: item.track,
    sessionType: item.sessionType || item.format || (item.isServiceSession ? "Service Session" : "Session"),
    isServiceSession: Boolean(item.isServiceSession),
    speakers: normalizeScheduleSpeakers(item),
    languages: item.languages ?? [],
    levels: item.levels ?? [],
  }));
}
