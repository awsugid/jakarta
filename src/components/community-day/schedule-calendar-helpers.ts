import type { ScheduleSpeaker } from "@/lib/types";

export interface DisplayScheduleSession {
  id: string;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  room?: string | null;
  rooms: string[];
  allRooms: boolean;
  track?: string | null;
  sessionType?: string | null;
  isServiceSession: boolean;
  speakers: ScheduleSpeaker[];
  languages: string[];
  levels: string[];
}

/** Multi-room label: "All rooms", joined names, or legacy string. */
export function roomLabelOf(
  s: Pick<DisplayScheduleSession, "allRooms" | "rooms" | "room">
): string {
  if (s.allRooms) return "All rooms";
  const formatName = (name?: string | null) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (trimmed === "800") return "Room 800";
    return trimmed;
  };
  if (s.rooms && s.rooms.length > 0) {
    return s.rooms.map(formatName).filter(Boolean).join(" · ");
  }
  return formatName(s.room);
}

/** Formats time range in Asia/Jakarta (WIB), e.g. "09:00 – 09:45 WIB" */
export function formatTime(
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

/** Formats ISO timestamp to short HH:MM in Asia/Jakarta (WIB), e.g. "09:00" */
export function formatTimeShort(startsAt?: string | null): string {
  if (!startsAt) return "--:--";
  try {
    const s = new Date(startsAt);
    return s.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return "";
  }
}

/** Parses ISO timestamp into minutes from midnight in Asia/Jakarta (WIB) */
export function parseMinutesOfDay(isoStr?: string | null): number | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const parts = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } catch {
    return null;
  }
}

/** Formats minutes of day into HH:MM string, e.g. 540 -> "09:00" */
export function formatHourMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Formats date in Asia/Jakarta, e.g. "Saturday, 31 January 2026" */
export function formatDateLabel(startsAt?: string | null): string {
  if (!startsAt) return "Date TBA";
  try {
    const d = new Date(startsAt);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return "";
  }
}

/** Calculates duration in minutes */
export function getDurationMinutes(
  startsAt?: string | null,
  endsAt?: string | null
): number | null {
  if (!startsAt || !endsAt) return null;
  try {
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    const diffMin = Math.round((e - s) / 60000);
    return diffMin > 0 ? diffMin : null;
  } catch {
    return null;
  }
}

/** Formats duration in minutes to string, e.g. "45m" or "1h 15m" */
export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/** Converts Date/ISO to compact UTC string: YYYYMMDDTHHmmssZ */
export function toUtcCompact(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  } catch {
    return "";
  }
}

/** Generates Google Calendar web add-event URL */
export function generateGoogleCalendarUrl(
  session: DisplayScheduleSession
): string {
  const startUtc = toUtcCompact(session.startsAt);
  // Default to +45 mins if no endsAt
  let endUtc = toUtcCompact(session.endsAt);
  if (!endUtc && session.startsAt) {
    const fallbackEnd = new Date(new Date(session.startsAt).getTime() + 45 * 60000);
    endUtc = toUtcCompact(fallbackEnd.toISOString());
  }

  const title = `${session.title} | AWS Community Day Jakarta 2026`;
  const speakersText =
    session.speakers && session.speakers.length > 0
      ? `\n\nSpeaker(s): ${session.speakers.map((sp) => `${sp.name}${sp.company ? ` (${sp.company})` : ""}`).join(", ")}`
      : "";
  const details = `${session.description || ""}${speakersText}\n\nAWS Community Day Jakarta 2026\nhttps://jakarta.awscommunity.id/comday`;
  const location = `${roomLabelOf(session) ? `${roomLabelOf(session)}, ` : ""}Jakarta, Indonesia`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escapes special characters for RFC 5545 iCalendar format */
function escapeIcsText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Generates valid RFC 5545 .ICS file string for one or multiple sessions */
export function generateIcsContent(
  sessions: DisplayScheduleSession[]
): string {
  const nowUtc = toUtcCompact(new Date().toISOString());

  const events = sessions
    .filter((s) => s.startsAt)
    .map((session) => {
      const startUtc = toUtcCompact(session.startsAt);
      let endUtc = toUtcCompact(session.endsAt);
      if (!endUtc && session.startsAt) {
        const fallbackEnd = new Date(new Date(session.startsAt).getTime() + 45 * 60000);
        endUtc = toUtcCompact(fallbackEnd.toISOString());
      }

      const uid = `comday2026-${session.id.replace(/[^a-zA-Z0-9-]/g, "")}@awscommunity.id`;
      const speakersText =
        session.speakers && session.speakers.length > 0
          ? `\\n\\nSpeaker(s): ${session.speakers.map((sp) => `${sp.name}${sp.company ? ` (${sp.company})` : ""}`).join(", ")}`
          : "";
      const desc = escapeIcsText(
        `${session.description || ""}${speakersText}\\n\\nAWS Community Day Jakarta 2026\\nhttps://jakarta.awscommunity.id/comday`
      );
      const loc = escapeIcsText(
        `${roomLabelOf(session) ? `${roomLabelOf(session)}, ` : ""}Jakarta, Indonesia`
      );
      const summary = escapeIcsText(
        `${session.title} | AWS Community Day Jakarta`
      );

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${nowUtc}`,
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${loc}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AWS User Group Indonesia//Community Day 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Triggers a client-side download of an .ICS calendar file */
export function downloadIcsFile(
  sessions: DisplayScheduleSession[],
  filename: string = "AWS-Community-Day-2026-Schedule.ics"
): void {
  if (typeof window === "undefined" || sessions.length === 0) return;

  const icsData = generateIcsContent(sessions);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Styling helpers for Session format badges */
export function getFormatBadgeClass(type?: string | null): string {
  if (!type) return "bg-primary/10 text-primary border-primary/30";
  const lower = type.toLowerCase();
  if (lower.includes("keynote") || lower.includes("plenum")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  }
  if (lower.includes("workshop") || lower.includes("hands-on")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/40";
  }
  if (lower.includes("panel")) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/40";
  }
  if (
    lower.includes("service") ||
    lower.includes("break") ||
    lower.includes("lunch") ||
    lower.includes("registration") ||
    lower.includes("closing")
  ) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  }
  return "bg-sky-500/15 text-sky-400 border-sky-500/40";
}

/** Styling helpers for Room badges */
export function getRoomBadgeClass(room?: string | null): string {
  if (!room) return "bg-muted text-muted-foreground border-border";
  const lower = room.toLowerCase();
  if (lower.includes("all")) {
    return "bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-400 border-orange-500/40";
  }
  if (lower.includes("atrium") || lower.includes("main")) {
    return "bg-orange-500/15 text-orange-400 border-orange-500/40";
  }
  if (lower.includes("800")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/40";
  }
  return "bg-cyan-500/15 text-cyan-400 border-cyan-500/40";
}

export interface ScheduleTimeSlot {
  slotKey: string;
  startsAt: string | null;
  endsAt: string | null;
  timeLabel: string;
  durationLabel: string;
  isPlenary: boolean;
  sessions: DisplayScheduleSession[];
}

/** Groups sessions chronologically into time slots for calendar grid & matrix layout */
export function groupSessionsIntoTimeSlots(
  sessions: DisplayScheduleSession[]
): ScheduleTimeSlot[] {
  const map = new Map<string, DisplayScheduleSession[]>();

  for (const session of sessions) {
    const key = session.startsAt || "unscheduled";
    const existing = map.get(key) || [];
    existing.push(session);
    map.set(key, existing);
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => {
    if (a === "unscheduled") return 1;
    if (b === "unscheduled") return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => {
    const slotSessions = map.get(key) || [];
    const first = slotSessions[0];
    const startsAt = first?.startsAt || null;
    let latestEndsAt = first?.endsAt || null;
    for (const s of slotSessions) {
      if (s.endsAt && (!latestEndsAt || s.endsAt > latestEndsAt)) {
        latestEndsAt = s.endsAt;
      }
    }

    const isPlenary = slotSessions.some((s) => s.allRooms || s.isServiceSession);
    const durationMin = getDurationMinutes(startsAt, latestEndsAt);

    return {
      slotKey: key,
      startsAt,
      endsAt: latestEndsAt,
      timeLabel: formatTime(startsAt, latestEndsAt),
      durationLabel: formatDuration(durationMin),
      isPlenary,
      sessions: slotSessions,
    };
  });
}
