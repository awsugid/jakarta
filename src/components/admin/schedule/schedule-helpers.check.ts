// Runnable self-check — no test framework needed:
//   bun src/components/admin/schedule/schedule-helpers.check.ts
import type { EventScheduleItem } from "@/lib/types";
import {
  DEFAULT_ZOOM_ID,
  TIME_STEP_MIN,
  ZOOM_LEVELS,
  axisRange,
  buildConflictMap,
  clampMinute,
  createRefreshGate,
  dayLabel,
  eventHeight,
  isScheduled,
  itemsConflict,
  minuteToOffset,
  nextDisplayOrder,
  offsetToMinute,
  planDirectoryMove,
  snapMinute,
  wibDay,
  wibMinutes,
  wibTime,
  type DirectoryEntry,
} from "./schedule-helpers";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

function eq(name: string, actual: unknown, expected: unknown): void {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected));
}

function item(partial: Partial<EventScheduleItem>): EventScheduleItem {
  return {
    id: "x",
    eventSlug: "e",
    title: "T",
    speakerIds: [],
    roomIds: [],
    allRooms: false,
    rooms: [],
    isServiceSession: false,
    isActive: true,
    displayOrder: 0,
    revision: 1,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

// WIB wall-clock math (fixed +07, no host timezone dependence)
ok("wibMinutes Z", wibMinutes("2026-10-31T02:00:00Z") === 9 * 60);
ok("wibMinutes +07", wibMinutes("2026-10-31T09:30:00+07:00") === 9 * 60 + 30);
ok("wibMinutes cross-day", wibMinutes("2026-10-30T20:00:00-05:00") === 8 * 60);
ok("wibMinutes null", wibMinutes(null) === null && wibMinutes("junk") === null);
ok("wibDay", wibDay("2026-10-31T23:30:00+07:00") === "2026-10-31");
ok("wibTime", wibTime("2026-10-31T02:05:00Z") === "09:05");

// Scheduled = both times parseable
ok(
  "isScheduled",
  isScheduled(item({ startsAt: "2026-10-31T09:00:00+07:00", endsAt: "2026-10-31T09:30:00+07:00" })) &&
    !isScheduled(item({ startsAt: null, endsAt: "2026-10-31T09:30:00+07:00" })),
);

// Conflicts: overlap + shared room; allRooms conflicts everything in that window
const a = item({ id: "a", title: "A", roomIds: ["r1"], startsAt: "2026-10-31T09:00:00+07:00", endsAt: "2026-10-31T10:00:00+07:00" });
const b = item({ id: "b", title: "B", roomIds: ["r1"], startsAt: "2026-10-31T09:30:00+07:00", endsAt: "2026-10-31T10:30:00+07:00" });
const c = item({ id: "c", title: "C", roomIds: ["r2"], startsAt: "2026-10-31T09:30:00+07:00", endsAt: "2026-10-31T10:30:00+07:00" });
const plenum = item({ id: "p", title: "P", allRooms: true, startsAt: "2026-10-31T09:45:00+07:00", endsAt: "2026-10-31T10:15:00+07:00" });
ok("overlap same room conflicts", itemsConflict(a, b));
ok("different room no conflict", !itemsConflict(a, c));
ok("allRooms conflicts any room", itemsConflict(plenum, c) && itemsConflict(plenum, a));
ok("no overlap no conflict", !itemsConflict(a, item({ ...b, startsAt: "2026-10-31T10:00:00+07:00" })));
ok("unscheduled never conflicts", !itemsConflict(a, item({ ...b, startsAt: null })));
const cmap = buildConflictMap([a, b, c, plenum]);
ok("map both directions", (cmap.get("a") ?? []).includes("B") && (cmap.get("b") ?? []).includes("A"));
ok("map plenum hits", (cmap.get("c") ?? []).includes("P"));

// Axis range floors/ceils to the hour and sizes at 96px/h
const range = axisRange([a]);
ok("axis floor/ceil", range !== null && range.startMin === 9 * 60 && range.endMin === 10 * 60);
ok("axis height", range !== null && range.height === 1 * 60 * 1.6);
ok("axis height follows zoom", axisRange([a], 3.2) !== null && axisRange([a], 3.2)!.height === 1 * 60 * 3.2);

// dayLabel regression: parsing "YYYY-MM-DD" with +07:00 then formatting UTC
// labeled the previous weekday (31 Oct 2026 showed as "Friday, 30 Oct 2026").
{
  // Locale punctuation varies across ICU builds (Node "Saturday, 31…" vs Bun "Saturday 31…"),
  // so assert the weekday and date parts, and assert the wrong-day output is gone.
  const got = dayLabel("2026-10-31");
  ok("dayLabel keeps the WIB calendar day", got.startsWith("Saturday") && got.includes("31 Oct 2026"));
  ok("dayLabel no off-by-one day", !got.includes("30 Oct") && !got.startsWith("Friday"));
  const ny = dayLabel("2026-01-01");
  ok("dayLabel year boundary", ny.startsWith("Thursday") && ny.includes("1 Jan 2026"));
}
ok("dayLabel passthrough on junk", dayLabel("not-a-day") === "not-a-day");

// Zoom levels: ids unique, ascending px, default exists.
ok(
  "zoom levels sane",
  ZOOM_LEVELS.length === 3 &&
    ZOOM_LEVELS.every((z, i) => i === 0 || z.pxPerMin > ZOOM_LEVELS[i - 1].pxPerMin) &&
    ZOOM_LEVELS.some((z) => z.id === DEFAULT_ZOOM_ID),
);

// Short events: duration-true height (no 30px floor) so back-to-back entries never overlap.
ok("5min at Compact is 8px", eventHeight(5, 1.6) === 8);
ok("5min at Comfortable is 25px", eventHeight(5, 5) === 25);
ok("5min at Detail is 35px", eventHeight(5, 7) === 35);
{
  // Two back-to-back 5-minute sessions at Compact: card n bottom == card n+1 top.
  const px = 1.6;
  const t1 = 8 * 60, t2 = 8 * 60 + 5;
  const top1 = minuteToOffset(t1, { startMin: 8 * 60, endMin: 17 * 60, height: 0 }, px);
  const top2 = minuteToOffset(t2, { startMin: 8 * 60, endMin: 17 * 60, height: 0 }, px);
  ok("back-to-back cards do not overlap", top1 + eventHeight(5, px) <= top2);
}

// Scrubber mapping: minute <-> offset round-trip, clamped at both ends, snapped to step.
{
  const r = { startMin: 8 * 60, endMin: 17 * 60, height: 0 } as const;
  const px = 3.2;
  ok("minuteToOffset", minuteToOffset(9 * 60 + 30, r, px) === 90 * px);
  ok("offsetToMinute round-trip", offsetToMinute(minuteToOffset(10 * 60 + 5, r, px), r, px) === 10 * 60 + 5);
  ok("offset below start clamps", offsetToMinute(-999, r, px) === r.startMin);
  ok("offset above end clamps", offsetToMinute(999999, r, px) === r.endMin);
  ok("minute above end clamps", minuteToOffset(24 * 60, r, px) === (r.endMin - r.startMin) * px);
  ok("snapMinute rounds to 5", snapMinute(602, r) === 600 && snapMinute(603, r) === 605);
  ok("snapMinute clamps into range", snapMinute(0, r) === r.startMin);
  ok("step constant", TIME_STEP_MIN === 5);
  ok("clampMinute bounds", clampMinute(0, r) === r.startMin && clampMinute(1439, r) === r.endMin && clampMinute(600, r) === 600);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
const gate = createRefreshGate();
const first = deferred();
const second = deferred();
let revision = 0;
let settled = false;
const oldRefresh = gate.run(async (current) => {
  await first.promise;
  if (current()) revision = 1;
}).then(() => { settled = true; });
const newRefresh = gate.run(async (current) => {
  await second.promise;
  if (current()) revision = 2;
});
first.resolve();
await Promise.resolve();
await Promise.resolve();
ok("superseded response ignored", revision === 0);
ok("mutation waits for newest refresh", !settled);
second.resolve();
await Promise.all([oldRefresh, newRefresh]);
ok("authoritative latest revision", revision === 2 && settled);
const late = deferred();
const leaving = gate.run(async (current) => {
  await late.promise;
  if (current()) revision = 3;
});
gate.invalidate();
late.resolve();
await leaving;
ok("event change/unmount ignores late response", revision === 2);
const slow = deferred();
const stale = gate.run(async (current) => {
  await slow.promise;
  if (current()) revision = 4;
});
await gate.run(async (current) => { if (current()) revision = 5; });
slow.resolve();
await stale;
ok("older request finishing last cannot overwrite", revision === 5);

// Directory displayOrder moves (rooms / talk formats).
// Regression: migrated seeds share displayOrder 0 and the backend tie-breaks
// by name; the old move() swapped displayOrder values, so 0 <-> 0 changed nothing.
function row(id: string, name: string, displayOrder: number, archived = false): DirectoryEntry {
  return { id, name, displayOrder, archived, revision: 1 };
}

const tied = [row("a", "Auditorium", 0), row("b", "Ballroom", 0), row("c", "Classroom", 0)];
eq("tied orders: move down assigns distinct ranks", planDirectoryMove(tied, "a", 1), [
  { id: "a", revision: 1, displayOrder: 1 },
  { id: "c", revision: 1, displayOrder: 2 },
]);
eq("tied orders: move up assigns distinct ranks", planDirectoryMove(tied, "c", -1), [
  { id: "c", revision: 1, displayOrder: 1 },
  { id: "b", revision: 1, displayOrder: 2 },
]);

// Tie-break must match the backend list query (displayOrder ASC, name ASC).
const shuffledTies = [row("b", "Ballroom", 0), row("a", "Auditorium", 0)];
eq("tie-break by name regardless of input order", planDirectoryMove(shuffledTies, "a", 1), [
  { id: "a", revision: 1, displayOrder: 1 },
]);

// Archived rows never participate and never receive updates.
const mixed = [
  row("a", "Auditorium", 0),
  row("x", "Old Room", 3, true),
  row("b", "Ballroom", 1),
  row("c", "Classroom", 2),
];
eq("archived interleaving: active re-ranked 0..n-1, archived untouched", planDirectoryMove(mixed, "b", -1), [
  { id: "b", revision: 1, displayOrder: 0 },
  { id: "a", revision: 1, displayOrder: 1 },
]);

// Already-unique orders: a move updates exactly the two swapped rows.
const uniq = [row("a", "Auditorium", 0), row("b", "Ballroom", 1), row("c", "Classroom", 2)];
eq("unique orders: only the two swapped rows update", planDirectoryMove(uniq, "b", 1), [
  { id: "c", revision: 1, displayOrder: 1 },
  { id: "b", revision: 1, displayOrder: 2 },
]);

// Boundary moves are no-ops.
eq("move up at top is a no-op", planDirectoryMove(uniq, "a", -1), []);
eq("move down at bottom is a no-op", planDirectoryMove(uniq, "c", 1), []);

// Adding must not collide with existing orders (old code used list.length).
const withArchived = [row("a", "Auditorium", 0), row("x", "Old Room", 5, true)];
ok("new entry gets max+1 across active and archived", nextDisplayOrder(withArchived) === 6);

console.log(`schedule-helpers: ${passed} checks passed`);
