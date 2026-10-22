import { describe, expect, test } from "bun:test";
import {
  formatTime,
  formatDateLabel,
  getDurationMinutes,
  formatDuration,
  toUtcCompact,
  generateGoogleCalendarUrl,
  generateIcsContent,
  roomLabelOf,
  getRoomBadgeClass,
  getFormatBadgeClass,
  groupSessionsIntoTimeSlots,
  type DisplayScheduleSession,
} from "./schedule-calendar-helpers";

describe("schedule-calendar-helpers", () => {
  const dummySession: DisplayScheduleSession = {
    id: "sess-1",
    title: "Keynote: Future of Cloud Architecture",
    description: "An exciting overview of cloud technologies.",
    startsAt: "2026-01-31T09:00:00+07:00",
    endsAt: "2026-01-31T09:45:00+07:00",
    room: "Main Stage / Atrium",
    rooms: ["Main Stage / Atrium"],
    allRooms: false,
    track: "Architecture",
    sessionType: "Keynote",
    isServiceSession: false,
    speakers: [
      {
        id: "spk-1",
        name: "Jane Doe",
        role: "Principal Architect",
        company: "Amazon Web Services",
      },
    ],
  };

  test("formatTime formats in WIB (24h)", () => {
    const formatted = formatTime(dummySession.startsAt, dummySession.endsAt);
    expect(formatted).toBe("09:00 – 09:45 WIB");
  });

  test("getDurationMinutes and formatDuration", () => {
    const mins = getDurationMinutes(dummySession.startsAt, dummySession.endsAt);
    expect(mins).toBe(45);
    expect(formatDuration(mins)).toBe("45m");
    expect(formatDuration(75)).toBe("1h 15m");
    expect(formatDuration(120)).toBe("2h");
  });

  test("toUtcCompact converts to YYYYMMDDTHHmmssZ", () => {
    const utc = toUtcCompact("2026-01-31T09:00:00+07:00");
    expect(utc).toBe("20260131T020000Z");
  });

  test("generateGoogleCalendarUrl builds valid URL", () => {
    const url = generateGoogleCalendarUrl(dummySession);
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("20260131T020000Z");
    expect(url).toContain("Future+of+Cloud+Architecture");
  });

  test("generateIcsContent produces RFC 5545 valid calendar", () => {
    const ics = generateIcsContent([dummySession]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Keynote: Future of Cloud Architecture | AWS Community Day Jakarta");
    expect(ics).toContain("DTSTART:20260131T020000Z");
    expect(ics).toContain("DTEND:20260131T024500Z");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  test("roomLabelOf handles allRooms and rooms array", () => {
    expect(roomLabelOf({ allRooms: true, rooms: [], room: null })).toBe("All rooms");
    expect(roomLabelOf({ allRooms: false, rooms: ["Room A", "Room B"], room: null })).toBe("Room A · Room B");
    expect(roomLabelOf({ allRooms: false, rooms: [], room: "Single Room" })).toBe("Single Room");
  });

  test("badge class helpers return theme styles", () => {
    expect(getFormatBadgeClass("Keynote")).toContain("amber");
    expect(getFormatBadgeClass("Workshop")).toContain("purple");
    expect(getRoomBadgeClass("Main Stage")).toContain("orange");
  });

  test("groupSessionsIntoTimeSlots correctly groups parallel tracks and identifies plenary", () => {
    const s1: DisplayScheduleSession = {
      ...dummySession,
      id: "reg",
      title: "Registration",
      startsAt: "2026-01-31T08:30:00+07:00",
      endsAt: "2026-01-31T09:30:00+07:00",
      allRooms: true,
      isServiceSession: true,
    };
    const s2: DisplayScheduleSession = {
      ...dummySession,
      id: "talk-1",
      title: "Track A Talk",
      startsAt: "2026-01-31T10:00:00+07:00",
      endsAt: "2026-01-31T10:45:00+07:00",
      room: "Room 1",
      rooms: ["Room 1"],
      allRooms: false,
      isServiceSession: false,
    };
    const s3: DisplayScheduleSession = {
      ...dummySession,
      id: "talk-2",
      title: "Track B Talk",
      startsAt: "2026-01-31T10:00:00+07:00",
      endsAt: "2026-01-31T10:45:00+07:00",
      room: "Room 2",
      rooms: ["Room 2"],
      allRooms: false,
      isServiceSession: false,
    };

    const slots = groupSessionsIntoTimeSlots([s1, s2, s3]);
    expect(slots.length).toBe(2);
    expect(slots[0].isPlenary).toBe(true);
    expect(slots[0].sessions.length).toBe(1);
    expect(slots[1].isPlenary).toBe(false);
    expect(slots[1].sessions.length).toBe(2);
  });
});
