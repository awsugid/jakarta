// Runnable self-check — no test framework needed:
//   bun src/components/admin/schedule/review-conflicts.test.ts
import { presentConflict, sessionTitle } from "./review-conflicts";
import type { EventScheduleItem } from "@/lib/types";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

const c = (type: string, detail: string, itemId?: string) => ({ type, itemId, detail });

// missing-fields variants
const room = presentConflict(c("missing-fields", "item is included in publication but has no room assignment", "a"));
ok("room heading", room.heading === "Choose a room");
ok("room why actionable", room.why.includes("Assign a room, or keep it as a draft."));
const unsched = presentConflict(c("missing-fields", "item is included in publication but is unscheduled (missing startsAt/endsAt)", "a"));
ok("unscheduled heading", unsched.heading === "Schedule this session");
const both = presentConflict(c("missing-fields", "scheduled item needs both startsAt and endsAt", "a"));
ok("needs-both heading", both.heading === "Schedule this session");
const noRooms = presentConflict(c("missing-fields", "allRooms is set but the event has no active rooms"));
ok("no-active-rooms heading", noRooms.heading === "Add a room");
const title = presentConflict(c("missing-fields", "title is required", "a"));
ok("title heading", title.heading === "Name this session");

// remaining known types
ok("invalid-range", presentConflict(c("invalid-range", "invalid time range: 10:00 .. 09:00")).heading === "Fix the times");
ok("unknown-format archived", presentConflict(c("unknown-format", "talk format f1 is archived")).heading === "Pick a talk format");
ok("unknown-format missing", presentConflict(c("unknown-format", "talk format f1 not found")).heading === "Pick a talk format");
ok("unknown-speaker", presentConflict(c("unknown-speaker", "speaker ids not in directory: s1, s2")).heading === "Fix the speakers");
ok("unknown-room", presentConflict(c("unknown-room", "room ids not usable: r9")).heading === "Fix the rooms");
ok("room-overlap", presentConflict(c("room-overlap", 'overlaps "Keynote" in the same room(s)')).heading === "Resolve the room clash");
ok("speaker-double-booking", presentConflict(c("speaker-double-booking", 'shares a speaker with overlapping "Talk"')).heading === "Resolve the double booking");

// fallbacks keep backend validation visible
const unknownType = presentConflict(c("brand-new-check", "custom validation detail XYZ"));
ok("unknown type heading", unknownType.heading === "Resolve this issue");
ok("unknown type keeps detail", unknownType.why === "custom validation detail XYZ");
const unmappedMissing = presentConflict(c("missing-fields", "some future missing thing"));
ok("unmapped missing-fields keeps detail", unmappedMissing.why === "some future missing thing");

// session title resolution
const items = [{ id: "s1", title: "Opening Keynote" } as EventScheduleItem];
ok("title found", sessionTitle(items, "s1") === "Opening Keynote");
ok("title missing falls back with id", sessionTitle(items, "gone") === "Unknown session (id: gone)");
ok("no item id is event-level", sessionTitle(items, undefined) === null);
ok("null item id is event-level", sessionTitle(items, null) === null);

console.log(`ok ${passed} checks`);
