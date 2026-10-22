// Runnable self-check — no test framework needed:
//   bun src/components/admin/schedule/schedule-helpers.check.ts
import type { EventScheduleItem } from "@/lib/types";
import {
  createRefreshGate,
  axisRange,
  buildConflictMap,
  isScheduled,
  itemsConflict,
  nextDisplayOrder,
  planDirectoryMove,
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
