import type { EventScheduleItem, ScheduleRoom } from "@/lib/types";
import { isBackToBack, shareRoom } from "@/lib/schedule-workspace";

export const KNOWN_SCHEDULE_EVENTS = [
  { slug: "community-day-2026", name: "AWS Community Day Jakarta 2026" },
  { slug: "monthly-meetup", name: "Monthly Meetup (Global / General)" },
  { slug: "voice-ai-agents-workshop-may-2026", name: "Voice AI Agents Workshop 2026" },
];

// Refresh callers wait for the newest request, including superseding refreshes.
export function createRefreshGate() {
  let sequence = 0;
  let latest: Promise<void> = Promise.resolve();
  return {
    invalidate() { sequence++; },
    async run(fetch: (isCurrent: () => boolean) => Promise<void>) {
      const request = ++sequence;
      latest = fetch(() => request === sequence);
      let pending: Promise<void>;
      do {
        pending = latest;
        await pending;
      } while (pending !== latest);
    },
  };
}

export const PX_PER_MIN = 1.6; // 96px per hour (Compact)

export interface ZoomLevel {
  id: string;
  label: string;
  pxPerMin: number;
}

/** Dense → roomy. Comfortable default: a 5-minute entry renders one readable line. */
export const ZOOM_LEVELS: readonly ZoomLevel[] = [
  { id: "compact", label: "Compact", pxPerMin: 1.6 },
  { id: "comfortable", label: "Comfortable", pxPerMin: 5 },
  { id: "detail", label: "Detail", pxPerMin: 7 },
] as const;

export const DEFAULT_ZOOM_ID = "comfortable";

/** Scrubber granularity in minutes. */
export const TIME_STEP_MIN = 5;

/** Card height is duration-true: back-to-back entries never visually overlap. */
export function eventHeight(durationMin: number, pxPerMin: number): number {
  return Math.max(0, durationMin) * pxPerMin;
}

/** Clamp a minute into the axis range (inclusive of both ends). */
export function clampMinute(minute: number, range: AxisRange): number {
  return Math.min(Math.max(minute, range.startMin), range.endMin);
}

/** Round to the scrubber step, then clamp into the range. */
export function snapMinute(minute: number, range: AxisRange, step = TIME_STEP_MIN): number {
  return clampMinute(Math.round(minute / step) * step, range);
}

/** Pixel offset from the grid body top for a minute (unclamped; caller clamps). */
export function minuteToOffset(minute: number, range: AxisRange, pxPerMin: number): number {
  return (clampMinute(minute, range) - range.startMin) * pxPerMin;
}

/** Inverse of minuteToOffset, clamped into the range. */
export function offsetToMinute(offset: number, range: AxisRange, pxPerMin: number): number {
  if (pxPerMin <= 0) return range.startMin;
  return clampMinute(range.startMin + offset / pxPerMin, range);
}

/** WIB wall-clock "YYYY-MM-DDTHH:MM" for an RFC3339 string, or "". */
function wibWall(rfc?: string | null): string {
  if (!rfc) return "";
  const ms = Date.parse(rfc);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms + 7 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Minutes since midnight (WIB) for an RFC3339 string, or null. */
export function wibMinutes(rfc?: string | null): number | null {
  const wall = wibWall(rfc);
  if (!wall) return null;
  const mins = Number(wall.slice(11, 13)) * 60 + Number(wall.slice(14, 16));
  return Number.isNaN(mins) ? null : mins;
}

/** WIB date "YYYY-MM-DD" for grouping, or "". */
export function wibDay(rfc?: string | null): string {
  return wibWall(rfc).slice(0, 10);
}

/** "HH:MM" WIB display for a time string. */
export function wibTime(rfc?: string | null): string {
  const wall = wibWall(rfc);
  return wall ? wall.slice(11, 16) : "";
}

export function isScheduled(item: EventScheduleItem): boolean {
  return wibMinutes(item.startsAt) !== null && wibMinutes(item.endsAt) !== null;
}

/** True when both items have valid overlapping times and share a room. */
export function itemsConflict(a: EventScheduleItem, b: EventScheduleItem): boolean {
  if (!isScheduled(a) || !isScheduled(b)) return false;
  if (a.startsAt === b.startsAt && a.id === b.id) return false;
  const aS = Date.parse(a.startsAt!);
  const aE = Date.parse(a.endsAt!);
  const bS = Date.parse(b.startsAt!);
  const bE = Date.parse(b.endsAt!);
  const overlap = aS < bE && bS < aE;
  return overlap && shareRoom(a, b);
}

/** itemId -> titles of conflicting peer items (both directions). */
export function buildConflictMap(items: EventScheduleItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!itemsConflict(a, b)) continue;
      map.set(a.id, [...(map.get(a.id) ?? []), b.title]);
      map.set(b.id, [...(map.get(b.id) ?? []), a.title]);
    }
  }
  return map;
}

export interface AxisRange {
  startMin: number; // floored to the hour
  endMin: number; // ceiled to the hour
  height: number;
}

export function axisRange(items: EventScheduleItem[], pxPerMin: number = PX_PER_MIN): AxisRange | null {
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const s = wibMinutes(it.startsAt);
    const e = wibMinutes(it.endsAt);
    if (s === null || e === null || e <= s) continue;
    min = Math.min(min, s);
    max = Math.max(max, e);
  }
  if (min === Infinity) return null;
  const startMin = Math.floor(min / 60) * 60;
  const endMin = Math.ceil(max / 60) * 60;
  return { startMin, endMin, height: (endMin - startMin) * pxPerMin };
}

/** Hour ticks; half-hour ticks once the density leaves room for them. */
export function hourTicks(range: AxisRange, pxPerMin: number = PX_PER_MIN): number[] {
  const step = pxPerMin >= 4 ? 30 : 60;
  const ticks: number[] = [];
  for (let m = range.startMin; m <= range.endMin; m += step) ticks.push(m);
  return ticks;
}

export function minuteLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}`;
}

/** Shape shared by ScheduleRoom and ScheduleFormat for directory ordering. */
export interface DirectoryEntry {
  id: string;
  name: string;
  displayOrder: number;
  archived: boolean;
  revision: number;
}

export interface DisplayOrderUpdate {
  id: string;
  revision: number;
  displayOrder: number;
}

/** Directory ordering matching the backend list query: displayOrder ASC, then name ASC. */
function directoryOrder(a: DirectoryEntry, b: DirectoryEntry): number {
  return a.displayOrder - b.displayOrder || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

/**
 * Plan an up/down move as a full re-rank of the active entries. Swapping raw
 * displayOrder values is a no-op when ties exist (migrated seeds share 0), so
 * positions are re-indexed 0..n-1 and only rows whose value changes return.
 */
export function planDirectoryMove<T extends DirectoryEntry>(
  entries: T[],
  id: string,
  dir: -1 | 1,
): DisplayOrderUpdate[] {
  const active = entries.filter((e) => !e.archived).sort(directoryOrder);
  const from = active.findIndex((e) => e.id === id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= active.length) return [];
  [active[from], active[to]] = [active[to], active[from]];
  return active
    .map((e, order) => (e.displayOrder === order ? null : { id: e.id, revision: e.revision, displayOrder: order }))
    .filter((u): u is DisplayOrderUpdate => u !== null);
}

/** Unique displayOrder for a new entry: max+1 across active and archived. */
export function nextDisplayOrder(entries: DirectoryEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, e.displayOrder), -1) + 1;
}

export function activeRooms(rooms: ScheduleRoom[]): ScheduleRoom[] {
  return rooms
    .filter((r) => !r.archived)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

/** Rooms (active first, then archived) sorted for directory display. */
export function orderedRooms(rooms: ScheduleRoom[]): ScheduleRoom[] {
  return [...rooms].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.displayOrder - b.displayOrder,
  );
}

export { isBackToBack };

/** "Saturday, 31 Oct 2026" style label for a WIB day string.
 * Parse as UTC midnight: the day string is already a WIB calendar date, so a
 * +07:00 offset would format as the previous UTC day (off-by-one regression). */
export function dayLabel(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms)) return day;
  return new Date(ms).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
