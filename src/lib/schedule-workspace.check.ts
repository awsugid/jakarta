// Runnable self-check — no test framework needed:
//   bun src/lib/schedule-workspace.check.ts
import type { ScheduleRoom } from "@/lib/types";
import {
  isBackToBack,
  isValidTimeRange,
  localInputToWibRfc3339,
  roomLabel,
  shareRoom,
  wibToLocalInput,
} from "@/lib/schedule-workspace";

let passed = 0;
function ok(name: string, cond: boolean): void {
  if (!cond) throw new Error(`FAIL: ${name}`);
  passed++;
}

// WIB <-> datetime-local roundtrip is stable.
const local = "2026-10-31T09:30";
ok("roundtrip stable", wibToLocalInput(localInputToWibRfc3339(local)) === local);
ok("rfc3339 exact", localInputToWibRfc3339(local) === "2026-10-31T09:30:00+07:00");
ok("malformed local -> empty", localInputToWibRfc3339("2026-10-31 09:30") === "");
ok("null -> empty", wibToLocalInput(null) === "");
ok("unparseable -> empty", wibToLocalInput("not-a-date") === "");
// UTC input shifted to WIB wall clock (02:00Z == 09:00 WIB).
ok("Z offset converted", wibToLocalInput("2026-10-31T02:00:00Z") === "2026-10-31T09:00");
// Negative-offset input (prev day in UTC) stays on WIB date.
ok("cross-day shift", wibToLocalInput("2026-10-30T20:00:00-05:00") === "2026-10-31T08:00");

// Time range validation: unscheduled allowed, invalid rejected.
const t = (startsAt?: string, endsAt?: string) => ({ startsAt, endsAt });
ok("valid range", isValidTimeRange(t("2026-10-31T09:00:00+07:00", "2026-10-31T10:00:00+07:00")));
ok("unscheduled ok", isValidTimeRange(t(undefined, undefined)));
ok("start only ok", isValidTimeRange(t("2026-10-31T09:00:00+07:00", undefined)));
ok("equal rejected", !isValidTimeRange(t("2026-10-31T09:00:00+07:00", "2026-10-31T09:00:00+07:00")));
ok("reversed rejected", !isValidTimeRange(t("2026-10-31T10:00:00+07:00", "2026-10-31T09:00:00+07:00")));
ok("unparseable rejected", !isValidTimeRange(t("garbage", "2026-10-31T09:00:00+07:00")));

// Back-to-back: exact touch, not gap, not overlap.
const a = { startsAt: "2026-10-31T09:00:00+07:00", endsAt: "2026-10-31T10:00:00+07:00" };
const b = { startsAt: "2026-10-31T10:00:00+07:00", endsAt: "2026-10-31T11:00:00+07:00" };
const c = { startsAt: "2026-10-31T10:30:00+07:00", endsAt: "2026-10-31T11:30:00+07:00" };
ok("touching back-to-back", isBackToBack(a, b));
ok("gap not back-to-back", !isBackToBack(a, c));
ok("overlap not back-to-back", !isBackToBack(a, { startsAt: a.startsAt, endsAt: "2026-10-31T09:30:00+07:00" }));
ok("missing times not back-to-back", !isBackToBack(a, { startsAt: undefined, endsAt: undefined }));
// Mixed offsets compare by instant (10:00+07 == 03:00Z).
ok("offset-normalized touch", isBackToBack(a, { startsAt: "2026-10-31T03:00:00Z", endsAt: "2026-10-31T04:00:00Z" }));

// Room matching and labels.
const rooms: ScheduleRoom[] = [
  { id: "r1", eventSlug: "cd2026", name: "Main Hall", displayOrder: 0, archived: false, revision: 1 },
  { id: "r2", eventSlug: "cd2026", name: "Workshop", displayOrder: 1, archived: false, revision: 1 },
];
const r = (roomIds: string[], allRooms = false, room?: string, resolved?: string[]) => ({ roomIds, allRooms, room, rooms: resolved });
ok("shared room", shareRoom(r(["r1"]), r(["r1", "r2"])));
ok("disjoint rooms", !shareRoom(r(["r1"]), r(["r2"])));
ok("allRooms matches any", shareRoom(r([], true), r(["r2"])));
ok("empty matches nothing", !shareRoom(r([]), r([])));
ok("label maps names in order", roomLabel(r(["r1", "r2"]), rooms) === "Main Hall, Workshop");
ok("label skips unknown ids", roomLabel(r(["r1", "zz"]), rooms) === "Main Hall");
ok("label all rooms", roomLabel(r([], true), rooms) === "All rooms");
ok("all rooms wins over roomIds", roomLabel(r(["r1"], true), rooms) === "All rooms");
ok("label resolved rooms fallback", roomLabel(r([], false, undefined, ["Main Hall", "Workshop"]), []) === "Main Hall, Workshop");
ok("roomIds win over resolved", roomLabel(r(["r1"], false, undefined, ["Stale"]), rooms) === "Main Hall");
ok("label legacy fallback", roomLabel(r([], false, "Stage A"), rooms) === "Stage A");
ok("label empty", roomLabel(r([]), rooms) === "");

console.log(`OK: ${passed} passed`);
