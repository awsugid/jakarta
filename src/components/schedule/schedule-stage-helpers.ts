import type { DisplayScheduleSession } from "@/components/community-day/schedule-calendar-helpers";
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
