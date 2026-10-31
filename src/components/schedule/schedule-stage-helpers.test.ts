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

  it("getShortSessionDisplayInfo produces readable labels and speaker subtitles for welcoming speeches and service sessions", () => {
    const { getShortSessionDisplayInfo } = require("./schedule-stage-helpers");

    const ugSpeech = {
      id: "ug-speech",
      title: "Welcoming Speech - AWS User Group Jakarta",
      speakerName: "Suhri",
      speakers: [{ name: "Suhri", role: "Organizer" }],
    };
    const info1 = getShortSessionDisplayInfo(ugSpeech);
    expect(info1.primaryLabel).toBe("AWS UG Jakarta");
    expect(info1.speakerName).toBe("Suhri");
    expect(info1.icon).toBe("🎤");

    const awsSpeech = {
      id: "aws-speech",
      title: "Welcoming Speech - AWS Representative",
      speakerName: "Eryan Ariowibowo",
      speakers: [{ name: "Eryan Ariowibowo", role: "AWS" }],
    };
    const info2 = getShortSessionDisplayInfo(awsSpeech);
    expect(info2.primaryLabel).toBe("AWS Representative");
    expect(info2.speakerName).toBe("Eryan Ariowibowo");

    const binusSpeech = {
      id: "binus-speech",
      title: "Welcoming Speech - Binus Representative",
      speakerName: "Fabian Surya Pramudya, S.T., M.T., Ph.D.",
      speakers: [{ name: "Fabian Surya Pramudya, S.T., M.T., Ph.D.", role: "Binus" }],
    };
    const info3 = getShortSessionDisplayInfo(binusSpeech);
    expect(info3.primaryLabel).toBe("Binus University");
    expect(info3.speakerName).toBe("Fabian Surya Pramudya");

    const docSession = {
      id: "doc-session",
      title: "Documentation",
      speakers: [],
    };
    const infoDoc = getShortSessionDisplayInfo(docSession);
    expect(infoDoc.primaryLabel).toBe("Documentation");
    expect(infoDoc.icon).toBe("📸");

    const kahootSession = {
      id: "kahoot-session",
      title: "Ice Breaking: Kahoot",
      speakers: [],
    };
    const infoKahoot = getShortSessionDisplayInfo(kahootSession);
    expect(infoKahoot.primaryLabel).toBe("Ice Breaking: Kahoot");
    expect(infoKahoot.icon).toBe("🎮");
  });

  it("computeLaneSessionLayouts clusters consecutive short sessions into subrows spanning the full available window", () => {
    const { computeLaneSessionLayouts } = require("./schedule-stage-helpers");

    const testSessions = [
      {
        id: "s1",
        title: "Welcoming Speech - AWS User Group Jakarta",
        startsAt: "2026-10-31T09:05:00+07:00",
        endsAt: "2026-10-31T09:10:00+07:00",
        speakers: [{ name: "Suhri" }],
      },
      {
        id: "s2",
        title: "Welcoming Speech - AWS Representative",
        startsAt: "2026-10-31T09:10:00+07:00",
        endsAt: "2026-10-31T09:15:00+07:00",
        speakers: [{ name: "Eryan Ariowibowo" }],
      },
      {
        id: "s3",
        title: "Welcoming Speech - Binus Representative",
        startsAt: "2026-10-31T09:15:00+07:00",
        endsAt: "2026-10-31T09:25:00+07:00",
        speakers: [{ name: "Fabian Surya" }],
      },
      {
        id: "s4",
        title: "Context Intelligence for your AI Agent at Scale",
        startsAt: "2026-10-31T09:25:00+07:00",
        endsAt: "2026-10-31T10:05:00+07:00",
        speakers: [{ name: "Juan Hasang" }],
      },
    ];

    const scale = 4.0;
    const labelWidth = 180;
    const T0 = 540; // 09:00 WIB
    const laneHeight = 160;
    const laneTop = 40;

    const layout = computeLaneSessionLayouts(testSessions as any, 0, laneTop, laneHeight, labelWidth, T0, scale);

    const s1Layout = layout.get("s1")!;
    const s2Layout = layout.get("s2")!;
    const s3Layout = layout.get("s3")!;
    const s4Layout = layout.get("s4")!;

    expect(s1Layout).toBeDefined();
    expect(s2Layout).toBeDefined();
    expect(s3Layout).toBeDefined();
    expect(s4Layout).toBeDefined();

    // All 3 welcoming speeches are assigned distinct tiers (subrows 1, 2, 3)
    expect(s1Layout.tier).toBe(1);
    expect(s2Layout.tier).toBe(2);
    expect(s3Layout.tier).toBe(3);

    // Each subrow card spans the entire 25 minutes (09:00 to 09:25) = 25 * 4 - 4 = 96px
    expect(s1Layout.blockWidth).toBe(96);
    expect(s2Layout.blockWidth).toBe(96);
    expect(s3Layout.blockWidth).toBe(96);

    // Subrows are stacked vertically with zero vertical overlap
    expect(s1Layout.blockTop).toBeLessThan(s2Layout.blockTop);
    expect(s2Layout.blockTop).toBeLessThan(s3Layout.blockTop);
    expect(s1Layout.blockTop + s1Layout.blockHeight).toBeLessThanOrEqual(s2Layout.blockTop);

    // Zero collision with s4 (which starts at 09:25)
    // 09:00 is at x = 180 + (540 - 540) * 4 + 2 = 182px
    // s1 extends to 182 + 96 = 278px
    // s4 is at x = 180 + (565 - 540) * 4 + 2 = 180 + 100 + 2 = 282px
    expect(s1Layout.blockLeft + s1Layout.blockWidth).toBeLessThanOrEqual(s4Layout.blockLeft);
  });
});
