import type { EventScheduleItem, ScheduleRoom } from "./types";

// WIB is a fixed UTC+7 offset (no DST), so conversions are pure arithmetic —
// never depend on the host timezone.

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** RFC3339 (any offset) -> "YYYY-MM-DDTHH:MM" WIB wall clock for datetime-local inputs. */
export function wibToLocalInput(rfc3339: string | null | undefined): string {
  if (!rfc3339) return "";
  const ms = Date.parse(rfc3339);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms + WIB_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** datetime-local "YYYY-MM-DDTHH:MM" -> RFC3339 at +07:00. "" when malformed. */
export function localInputToWibRfc3339(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return "";
  return `${local}:00+07:00`;
}

type TimeFields = Pick<EventScheduleItem, "startsAt" | "endsAt">;

/**
 * True when times are usable: absent times are fine (unscheduled imports),
 * but present times must parse and start strictly before end.
 */
export function isValidTimeRange(item: TimeFields): boolean {
  const { startsAt, endsAt } = item;
  if (!startsAt || !endsAt) return true;
  const s = Date.parse(startsAt);
  const e = Date.parse(endsAt);
  return !Number.isNaN(s) && !Number.isNaN(e) && s < e;
}

/** True when one item ends exactly when the other starts (same instant, no gap). */
export function isBackToBack(a: TimeFields, b: TimeFields): boolean {
  if (!a.startsAt || !a.endsAt || !b.startsAt || !b.endsAt) return false;
  return (
    Date.parse(a.endsAt) === Date.parse(b.startsAt) ||
    Date.parse(b.endsAt) === Date.parse(a.startsAt)
  );
}

type RoomFields = Pick<EventScheduleItem, "roomIds" | "allRooms" | "rooms" | "room">;

/** True when both items can occupy at least one common room. */
export function shareRoom(a: RoomFields, b: RoomFields): boolean {
  if (a.allRooms || b.allRooms) return true;
  // ponytail: legacy `room` string not matched — roomIds/allRooms are the
  // authoritative contract; add legacy matching only if old data needs it.
  const aIds = new Set(a.roomIds ?? []);
  return (b.roomIds ?? []).some((id) => aIds.has(id));
}

/** Display label: "All rooms", matched room names (or resolved `rooms`), legacy fallback. */
export function roomLabel(item: RoomFields, rooms: ScheduleRoom[]): string {
  if (item.allRooms) return "All rooms";
  const byId = new Map(rooms.map((r) => [r.id, r.name]));
  const names = (item.roomIds ?? [])
    .map((id) => byId.get(id))
    .filter((n): n is string => Boolean(n));
  if (names.length > 0) return names.join(", ");
  if (item.rooms && item.rooms.length > 0) return item.rooms.join(", ");
  return item.room ?? "";
}
