import { describe, expect, it } from "bun:test";
import {
  formatTimeRangeWib,
  formatWibClock,
  formatMinutesToTime,
  parseDemoTimeToDate,
  getMinutesRemaining,
  filterSessionsByRoom,
  resolveActiveSession,
  mapEventItemsToDisplaySessions,
} from "./schedule-stage-helpers";
import type { EventScheduleItem } from "@/lib/types";

const MOCK_SCHEDULE_ITEMS: EventScheduleItem[] = [
  {
    id: "session-open-gate",
    eventSlug: "community-day-2026",
    title: "Open Gate",
    startsAt: "2026-10-31T08:00:00+07:00",
    endsAt: "2026-10-31T08:30:00+07:00",
    room: "Atrium",
    track: "Main Stage",
    allRooms: false,
    rooms: ["Atrium"],
    roomIds: ["room-1"],
    speakerIds: [],
    languages: [],
    levels: [],
    isServiceSession: true,
    isActive: true,
    displayOrder: 0,
    revision: 1,
    createdAt: "2026-10-22",
    updatedAt: "2026-10-25",
  },
  {
    id: "session-arief",
    eventSlug: "community-day-2026",
    title: "Architecting for the Future: Scaling Modern Workloads with AWS Cloud-Native Databases",
    startsAt: "2026-10-31T11:05:00+07:00",
    endsAt: "2026-10-31T13:05:00+07:00",
    room: "800",
    track: "Classroom 1",
    allRooms: false,
    rooms: ["800"],
    roomIds: ["room-800"],
    speakerIds: ["arief"],
    speakers: [
      {
        name: "Arief Nugraha",
        role: "Solution Architect",
        company: "AWS",
      },
    ],
    languages: ["Bahasa Indonesia"],
    levels: [],
    isServiceSession: false,
    isActive: true,
    displayOrder: 1,
    revision: 1,
    createdAt: "2026-10-22",
    updatedAt: "2026-10-25",
  },
  {
    id: "session-lunch",
    eventSlug: "community-day-2026",
    title: "Prayer, Networking & Lunch Time",
    startsAt: "2026-10-31T12:20:00+07:00",
    endsAt: "2026-10-31T13:20:00+07:00",
    room: "Atrium",
    track: "Main Stage",
    allRooms: false,
    rooms: ["Atrium"],
    roomIds: ["room-atrium"],
    speakerIds: [],
    languages: [],
    levels: [],
    isServiceSession: true,
    isActive: true,
    displayOrder: 2,
    revision: 1,
    createdAt: "2026-10-22",
    updatedAt: "2026-10-25",
  },
  {
    id: "session-felicia",
    eventSlug: "community-day-2026",
    title: "Build a Serverless AI Game with Amazon Rekognition and AWS Lambda",
    startsAt: "2026-10-31T14:05:00+07:00",
    endsAt: "2026-10-31T16:05:00+07:00",
    room: "800",
    track: "Classroom 1",
    allRooms: false,
    rooms: ["800"],
    roomIds: ["room-800"],
    speakerIds: ["felicia"],
    speakers: [
      {
        name: "Felicia Suryawinata",
        role: "Associate Solutions Architect",
        company: "AWS",
        avatar: "https://avatars.awscommunity.id/community-day-2026/speakers/4d766360f27f_1792585355.jpg",
      },
    ],
    languages: ["Bahasa Indonesia", "English"],
    levels: [],
    isServiceSession: false,
    isActive: true,
    displayOrder: 3,
    revision: 1,
    createdAt: "2026-10-22",
    updatedAt: "2026-10-25",
  },
  {
    id: "session-closing",
    eventSlug: "community-day-2026",
    title: "Closing",
    startsAt: "2026-10-31T16:20:00+07:00",
    endsAt: "2026-10-31T16:45:00+07:00",
    room: "Atrium",
    track: "Main Stage",
    allRooms: false,
    rooms: ["Atrium"],
    roomIds: ["room-atrium"],
    speakerIds: [],
    languages: [],
    levels: [],
    isServiceSession: true,
    isActive: true,
    displayOrder: 4,
    revision: 1,
    createdAt: "2026-10-22",
    updatedAt: "2026-10-25",
  },
];

describe("schedule-stage-helpers", () => {
  it("formatTimeRangeWib correctly formats in WIB (UTC+7)", () => {
    const start = "2026-10-31T14:05:00+07:00";
    const end = "2026-10-31T16:05:00+07:00";
    const result = formatTimeRangeWib(start, end);
    expect(result).toBe("14:05 – 16:05 WIB");
  });

  it("formatWibClock outputs 24-hour time with seconds", () => {
    const d = new Date("2026-10-31T09:15:30+07:00");
    const formatted = formatWibClock(d);
    expect(formatted).toBe("09:15:30");
  });

  it("formatMinutesToTime accurately converts minutes of day", () => {
    expect(formatMinutesToTime(540)).toBe("09:00");
    expect(formatMinutesToTime(845)).toBe("14:05");
    expect(formatMinutesToTime(990)).toBe("16:30");
  });

  it("parseDemoTimeToDate correctly parses HH:mm into Date object", () => {
    const parsed = parseDemoTimeToDate("14:05");
    expect(parsed).not.toBeNull();
    const wibFormatted = parsed?.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    expect(wibFormatted).toBe("14:05");
  });

  it("getMinutesRemaining calculates remaining minutes accurately", () => {
    const now = new Date("2026-10-31T12:00:00+07:00");
    const target = new Date("2026-10-31T12:25:00+07:00");
    expect(getMinutesRemaining(target, now)).toBe(25);
  });

  it("filterSessionsByRoom includes allRooms and matches specific room", () => {
    const sessions = mapEventItemsToDisplaySessions(MOCK_SCHEDULE_ITEMS);

    // "ALL" should return all sessions
    const all = filterSessionsByRoom(sessions, "ALL");
    expect(all.length).toBe(sessions.length);

    // Filter to Room 800
    const room800 = filterSessionsByRoom(sessions, "800");
    // Should contain Felicia and Arief's workshops plus plenary sessions
    expect(room800.some((s) => s.speakers.some((sp) => sp.name.includes("Felicia")))).toBe(true);
    expect(room800.some((s) => s.speakers.some((sp) => sp.name.includes("Arief")))).toBe(true);
    expect(room800.some((s) => s.title === "Open Gate")).toBe(true); // plenary session
  });

  it("resolveActiveSession correctly identifies active talk at 14:15 WIB", () => {
    const sessions = mapEventItemsToDisplaySessions(MOCK_SCHEDULE_ITEMS);
    const testNow = new Date("2026-10-31T14:15:00+07:00");

    const { currentSession, upcomingSession } = resolveActiveSession(sessions, testNow, "800");

    expect(currentSession).not.toBeNull();
    expect(currentSession?.title).toContain("Build a Serverless AI Game");
    expect(currentSession?.speakers[0]?.name).toBe("Felicia Suryawinata");
    expect(upcomingSession).not.toBeNull();
  });

  it("resolveActiveSession correctly identifies lunch break at 12:30 WIB", () => {
    const sessions = mapEventItemsToDisplaySessions(MOCK_SCHEDULE_ITEMS);
    const testNow = new Date("2026-10-31T12:30:00+07:00");

    const { currentSession } = resolveActiveSession(sessions, testNow, "ALL");

    expect(currentSession).not.toBeNull();
    expect(currentSession?.isServiceSession).toBe(true);
    expect(currentSession?.title).toContain("Lunch");
  });

  it("resolveActiveSession detects pre-event and post-event phases", () => {
    const sessions = mapEventItemsToDisplaySessions(MOCK_SCHEDULE_ITEMS);

    const earlyMorning = new Date("2026-10-31T07:00:00+07:00");
    const preResult = resolveActiveSession(sessions, earlyMorning, "ALL");
    expect(preResult.isPreEvent).toBe(true);
    expect(preResult.isPostEvent).toBe(false);

    const lateEvening = new Date("2026-10-31T18:00:00+07:00");
    const postResult = resolveActiveSession(sessions, lateEvening, "ALL");
    expect(postResult.isPreEvent).toBe(false);
    expect(postResult.isPostEvent).toBe(true);
  });
});
