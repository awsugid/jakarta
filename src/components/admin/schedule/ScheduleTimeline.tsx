"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  MapPin,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EventScheduleItem, ScheduleFormat, ScheduleRoom } from "@/lib/types";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";
import { formatMetadataList } from "@/lib/schedule-metadata";
import { roomLabel } from "@/lib/schedule-workspace";
import {
  DEFAULT_ZOOM_ID,
  PX_PER_MIN,
  TIME_STEP_MIN,
  ZOOM_LEVELS,
  activeRooms,
  axisRange,
  buildConflictMap,
  clampMinute,
  dayLabel,
  eventHeight,
  hourTicks,
  isScheduled,
  minuteLabel,
  minuteToOffset,
  offsetToMinute,
  snapMinute,
  wibDay,
  wibMinutes,
  type AxisRange,
} from "./schedule-helpers";

interface ScheduleTimelineProps {
  items: EventScheduleItem[];
  rooms: ScheduleRoom[];
  formats: ScheduleFormat[];
  busyId: string | null;
  mutationsBlocked?: boolean;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}

const GUTTER_PX = 56;
const MutationsBlocked = createContext(false);

export function ScheduleTimeline({ items, rooms, formats, busyId, mutationsBlocked, onEdit, onToggleInclude }: ScheduleTimelineProps) {
  const [trayOpen, setTrayOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileRoom, setMobileRoom] = useState<string>("ALL");
  const [zoomId, setZoomId] = useState(DEFAULT_ZOOM_ID);
  const pxPerMin = ZOOM_LEVELS.find((z) => z.id === zoomId)?.pxPerMin ?? PX_PER_MIN;

  const liveRooms = activeRooms(rooms);
  const liveRoomIds = useMemo(() => new Set(liveRooms.map((r) => r.id)), [liveRooms]);
  const formatName = useMemo(() => new Map(formats.map((f) => [f.id, f.name])), [formats]);
  const conflicts = useMemo(() => buildConflictMap(items), [items]);

  const scheduled = items.filter(
    (it) => isScheduled(it) && (it.allRooms || (it.roomIds || []).some((id) => liveRoomIds.has(id))),
  );
  const unscheduled = items.filter(
    (it) => !isScheduled(it) || (!it.allRooms && !(it.roomIds || []).some((id) => liveRoomIds.has(id))),
  );

  const days = useMemo(() => {
    const byDay = new Map<string, EventScheduleItem[]>();
    for (const it of scheduled) {
      const day = wibDay(it.startsAt);
      if (!day) continue;
      byDay.set(day, [...(byDay.get(day) ?? []), it]);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [scheduled]);

  return (
    <MutationsBlocked.Provider value={!!mutationsBlocked}>
      <div className={`grid min-w-0 gap-4 ${trayOpen ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
      {/* Unscheduled / needs-room tray */}
      <section aria-label="Unscheduled sessions" className={`min-w-0 self-start rounded-xl border border-border bg-card/40 ${trayOpen ? "xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:sticky xl:top-20" : ""}`}>
        <button
          type="button"
          onClick={() => setTrayOpen((v) => !v)}
          aria-expanded={trayOpen}
          aria-controls="unscheduled-tray"
          className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
            Unscheduled
            <Badge variant="secondary" className="text-[10px]">{unscheduled.length}</Badge>
          </span>
          {trayOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {trayOpen && (
          <div id="unscheduled-tray" className="px-3 pb-3 space-y-2">
            <Input aria-label="Search unscheduled sessions" placeholder="Search title or speaker…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9" />
            <div className="max-h-[50vh] xl:max-h-[65vh] overflow-y-auto space-y-2">
            {unscheduled.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Everything is scheduled and roomed. New drafts and Sessionize imports land here.
              </p>
            ) : (
              unscheduled.filter((item) => `${item.title} ${speakersLine(item)}`.toLowerCase().includes(query.trim().toLowerCase())).map((item) => (
                <TrayRow
                  key={item.id}
                  item={item}
                  rooms={rooms}
                  formatName={formatName.get(item.formatId || "")}
                  conflictTitles={conflicts.get(item.id) ?? []}
                  busy={busyId === item.id}
                  onEdit={onEdit}
                  onToggleInclude={onToggleInclude}
                />
              ))
            )}
            {unscheduled.length > 0 && !unscheduled.some((item) => `${item.title} ${speakersLine(item)}`.toLowerCase().includes(query.trim().toLowerCase())) && <p className="py-3 text-sm text-muted-foreground">No drafts match your search.</p>}
            </div>
          </div>
        )}
      </section>

      <div className={`min-w-0 xl:col-start-1 ${trayOpen ? "xl:row-start-1" : "xl:row-start-2"}`}>
      <h3 className="mb-3 text-sm font-semibold">Agenda <span className="font-normal text-muted-foreground">· WIB (UTC+7)</span></h3>
      {/* Desktop: time-axis room columns */}
      <div className="hidden lg:block space-y-8">
        {days.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No scheduled sessions yet — create one or import from Sessionize, then set its times.
          </p>
        ) : (
          days.map(([day, dayItems]) => {
            const range = axisRange(dayItems, pxPerMin);
            if (!range) return null;
            return (
              <section key={day} aria-label={`Schedule for ${dayLabel(day)}`}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <h3 className="text-sm font-bold text-foreground">{dayLabel(day)}</h3>
                  <div role="group" aria-label="Grid density" className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
                    {ZOOM_LEVELS.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        aria-pressed={z.id === zoomId}
                        onClick={() => setZoomId(z.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          z.id === zoomId
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
                <DayGrid
                  dayItems={dayItems}
                  rooms={liveRooms}
                  range={range}
                  pxPerMin={pxPerMin}
                  conflicts={conflicts}
                  formatName={formatName}
                  busyId={busyId}
                  onEdit={onEdit}
                  onToggleInclude={onToggleInclude}
                />
              </section>
            );
          })
        )}
      </div>

      {/* Mobile: room filter + chronological list */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Filter by room">
          <RoomChip active={mobileRoom === "ALL"} onClick={() => setMobileRoom("ALL")} label={`All (${scheduled.length})`} />
          {liveRooms.map((room) => (
            <RoomChip
              key={room.id}
              active={mobileRoom === room.id}
              onClick={() => setMobileRoom(room.id)}
              label={`${room.name} (${scheduled.filter((it) => it.allRooms || it.roomIds?.includes(room.id)).length})`}
            />
          ))}
        </div>

        {days.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scheduled sessions yet.</p>
        ) : (
          days.map(([day, dayItems]) => {
            const rows = dayItems
              .filter((it) => mobileRoom === "ALL" || it.allRooms || it.roomIds?.includes(mobileRoom))
              .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
            if (rows.length === 0) return null;
            return (
              <section key={day} aria-label={`Schedule for ${dayLabel(day)}`} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel(day)}
                </h3>
                {rows.map((item) => (
                  <ListRow
                    key={item.id}
                    item={item}
                    rooms={rooms}
                    formatName={formatName.get(item.formatId || "")}
                    conflictTitles={conflicts.get(item.id) ?? []}
                    busy={busyId === item.id}
                    onEdit={onEdit}
                    onToggleInclude={onToggleInclude}
                  />
                ))}
              </section>
            );
          })
        )}
      </div>
      </div>
      </div>
    </MutationsBlocked.Provider>
  );
}

function RoomChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function IncludeButton({
  item,
  busy,
  onToggleInclude,
  micro = false,
}: {
  item: EventScheduleItem;
  busy: boolean;
  onToggleInclude: (item: EventScheduleItem) => void;
  micro?: boolean;
}) {
  const blocked = useContext(MutationsBlocked);
  return (
    <button
      type="button"
      onClick={() => onToggleInclude(item)}
      disabled={busy || blocked}
      aria-pressed={item.isActive}
      aria-label={
        item.isActive
          ? `Exclude “${item.title}” from next publication`
          : `Include “${item.title}” in next publication`
      }
      title={item.isActive ? "Included in next publication" : "Excluded draft"}
      className={`inline-flex items-center justify-center rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
        micro ? "h-6 w-6" : "h-7 w-7"
      } ${
        item.isActive
          ? "text-emerald-400 hover:bg-emerald-500/10"
          : "text-muted-foreground/60 hover:bg-muted/70"
      }`}
    >
      {busy ? <Loader2 className={`${micro ? "h-3" : "h-3.5"} ${micro ? "w-3" : "w-3.5"} animate-spin`} /> : item.isActive ? <Eye className={micro ? "h-3.5 w-3.5" : "h-4 w-4"} /> : <EyeOff className={micro ? "h-3.5 w-3.5" : "h-4 w-4"} />}
    </button>
  );
}

function EditButton({
  item,
  onEdit,
  compact = false,
  micro = false,
}: {
  item: EventScheduleItem;
  onEdit: (item: EventScheduleItem) => void;
  compact?: boolean;
  micro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-label={`Edit ${item.title}`}
      title="Edit session"
      className={`inline-flex items-center justify-center gap-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
        micro ? "h-6 w-6" : compact ? "h-7 w-7" : "h-7 px-2 text-[11px] font-semibold"
      }`}
    >
      <Pencil className={micro ? "h-3 w-3" : compact ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {!compact && !micro && <span>Edit</span>}
    </button>
  );
}

function ConflictMark({ titles }: { titles: string[] }) {
  if (titles.length === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive"
      title={`Overlaps: ${titles.join(", ")}`}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {titles.length}
      <span className="sr-only"> conflicting sessions: {titles.join(", ")}</span>
    </span>
  );
}

function speakersLine(item: EventScheduleItem): string {
  const spk = normalizeScheduleSpeakers(item);
  if (spk.length === 0) return "";
  return spk.map((s) => s.name).join(", ");
}

function metaLine(item: EventScheduleItem, formatName?: string): string {
  return [
    speakersLine(item),
    formatName,
    formatMetadataList(item.languages),
    formatMetadataList(item.levels),
    item.isServiceSession ? "Service" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function wibTimeOf(item: EventScheduleItem): string {
  const s = wibMinutes(item.startsAt);
  const e = wibMinutes(item.endsAt);
  const fmt = (m: number | null) => (m === null ? "" : minuteLabel(m));
  return e === null ? fmt(s) : `${fmt(s)}–${fmt(e)}`;
}

function DayGrid({
  dayItems,
  rooms,
  range,
  pxPerMin,
  conflicts,
  formatName,
  busyId,
  onEdit,
  onToggleInclude,
}: {
  dayItems: EventScheduleItem[];
  rooms: ScheduleRoom[];
  range: AxisRange;
  pxPerMin: number;
  conflicts: Map<string, string[]>;
  formatName: Map<string, string>;
  busyId: string | null;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  const scrubberId = useId();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const suppressSync = useRef(false);
  const syncTimer = useRef<number>(0);
  const syncRaf = useRef(0);
  const prevPx = useRef(pxPerMin);
  // Last minute actually seen at the viewport top. The browser clamps scrollTop
  // synchronously when zoom shrinks the content, so re-deriving it from scrollTop
  // in the zoom effect reads post-clamp garbage; the ref keeps the true anchor.
  const viewMin = useRef(snapMinute(range.startMin, range));
  const [scrubMin, setScrubMin] = useState(() => snapMinute(range.startMin, range));
  const shownMin = clampMinute(scrubMin, range);

  /** Top of the time axis inside the scroll content (below the sticky header). */
  const axisTop = useCallback(() => {
    const sc = scrollRef.current;
    const bd = bodyRef.current;
    if (!sc || !bd) return 0;
    return bd.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
  }, []);

  /** Scroll the bounded viewport so `minute` sits at its top edge (clamped by the browser). */
  const jumpTo = useCallback(
    (minute: number) => {
      const m = snapMinute(minute, range);
      setScrubMin(m);
      viewMin.current = m;
      const sc = scrollRef.current;
      if (!sc) return;
      suppressSync.current = true;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        suppressSync.current = false;
      }, 500);
      sc.scrollTo({ top: axisTop() + minuteToOffset(m, range, pxPerMin), behavior: "smooth" });
    },
    [range, pxPerMin, axisTop],
  );

  const onScroll = useCallback(() => {
    if (suppressSync.current) return;
    cancelAnimationFrame(syncRaf.current);
    syncRaf.current = requestAnimationFrame(() => {
      const sc = scrollRef.current;
      if (!sc) return;
      const m = snapMinute(offsetToMinute(sc.scrollTop - axisTop(), range, pxPerMin), range);
      viewMin.current = m;
      setScrubMin((prev) => (prev === m ? prev : m));
    });
  }, [range, pxPerMin, axisTop]);

  useEffect(() => () => {
    cancelAnimationFrame(syncRaf.current);
    window.clearTimeout(syncTimer.current);
  }, []);

  // Keep the viewed minute anchored when the density changes.
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc || prevPx.current === pxPerMin) return;
    prevPx.current = pxPerMin;
    sc.scrollTop = axisTop() + minuteToOffset(viewMin.current, range, pxPerMin);
  }, [pxPerMin, range, axisTop]);

  const startMin = range.startMin;
  const ticks = hourTicks(range, pxPerMin);
  function pos(item: EventScheduleItem): { top: number; height: number } | null {
    const s = wibMinutes(item.startsAt);
    const e = wibMinutes(item.endsAt);
    if (s === null || e === null || e <= s) return null;
    // Duration-true height: back-to-back entries (5-min gaps included) never overlap.
    return { top: (s - startMin) * pxPerMin, height: eventHeight(e - s, pxPerMin) };
  }

  const columnItems = dayItems.filter((it) => !it.allRooms);
  const bandItems = dayItems.filter((it) => it.allRooms);

  return (
    <div>
      {/* Time scrubber — navigation only, never mutates data */}
      <div className="mb-2 flex items-center gap-3">
        <label htmlFor={scrubberId} className="shrink-0 text-xs font-semibold text-foreground">
          Jump to time
        </label>
        <input
          id={scrubberId}
          type="range"
          min={range.startMin}
          max={range.endMin}
          step={TIME_STEP_MIN}
          value={shownMin}
          onChange={(e) => jumpTo(Number(e.target.value))}
          aria-valuetext={`${minuteLabel(shownMin)} WIB`}
          className="h-7 min-w-0 flex-1 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        />
        <output htmlFor={scrubberId} className="w-[74px] shrink-0 text-right text-xs font-bold tabular-nums text-primary">
          {minuteLabel(shownMin)}
          <span className="ml-1 font-normal text-muted-foreground">WIB</span>
        </output>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="overscroll-contain max-h-[68vh] min-h-[280px] overflow-auto rounded-2xl border border-border/80 bg-card/40"
      >
        <div style={{ minWidth: GUTTER_PX + rooms.length * 150 }}>
          {/* Sticky room header */}
          <div className="sticky top-0 z-30 flex border-b border-border/80 bg-card shadow-sm">
            <div className="sticky left-0 z-40 shrink-0 bg-card" style={{ width: GUTTER_PX }} aria-hidden="true" />
            {rooms.map((room) => (
              <div key={room.id} className="min-w-[150px] flex-1 truncate border-l border-border/60 px-2 py-2 text-center text-xs font-semibold text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 text-purple-400" aria-hidden="true" />
                  {room.name}
                </span>
              </div>
            ))}
          </div>

          {/* Bounded day grid body */}
          <div data-agenda-body ref={bodyRef} className="relative">
            <div className="relative flex" style={{ height: range.height + 16 }}>
              {/* Sticky time gutter */}
              <div className="sticky left-0 z-20 shrink-0 border-r border-border/60 bg-card" style={{ width: GUTTER_PX }}>
                {ticks.map((t) => (
                  <span
                    key={t}
                    className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground"
                    style={{ top: (t - startMin) * pxPerMin }}
                  >
                    {minuteLabel(t)}
                  </span>
                ))}
              </div>

              {/* Room columns with hour lines */}
              {rooms.map((room) => (
                <div key={room.id} className="relative min-w-[150px] flex-1 border-l border-border/60">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px " + 60 * pxPerMin + "px)",
                    }}
                    aria-hidden="true"
                  />
                  {columnItems
                    .filter((it) => it.roomIds?.includes(room.id))
                    .map((item) => {
                      const p = pos(item);
                      if (!p) return null;
                      return (
                        <GridCard
                          key={`${room.id}-${item.id}`}
                          item={item}
                          roomName={room.name}
                          top={p.top}
                          height={p.height}
                          conflictTitles={conflicts.get(item.id) ?? []}
                          formatName={formatName.get(item.formatId || "")}
                          busy={busyId === item.id}
                          onEdit={onEdit}
                          onToggleInclude={onToggleInclude}
                        />
                      );
                    })}
                </div>
              ))}

              {/* All-rooms bands overlay every column */}
              {bandItems.map((item) => {
                const p = pos(item);
                if (!p) return null;
                const meta = metaLine(item, formatName.get(item.formatId || ""));
                return (
                  <article
                    key={`band-${item.id}`}
                    className="absolute z-10 flex items-start gap-2 overflow-hidden rounded-lg border border-dashed border-primary/40 bg-primary/10 px-3 py-1.5 backdrop-blur-[1px]"
                    style={{ top: p.top, height: p.height, left: GUTTER_PX, right: 0 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[10px] font-bold tabular-nums text-primary">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {wibTimeOf(item)} WIB · All rooms
                        <ConflictMark titles={conflicts.get(item.id) ?? []} />
                        {!item.isActive && <Badge variant="outline" className="text-[9px] text-muted-foreground">Draft</Badge>}
                      </p>
                      <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                      {meta && <p className={`truncate text-[10px] text-muted-foreground ${p.height < 52 ? "sr-only" : ""}`}>{meta}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <EditButton item={item} onEdit={onEdit} compact />
                      <IncludeButton item={item} busy={busyId === item.id} onToggleInclude={onToggleInclude} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_LINE_PX = 24; // below this a card cannot hold a text line

/** Hover/focus details for cards too short to show them inline. Transient overlay —
 *  the static layout never relies on it, so adjacent entries stay overlap-free. */
function CardPopover({
  item,
  roomName,
  timeText,
  meta,
  conflictTitles,
  busy,
  onEdit,
  onToggleInclude,
}: {
  item: EventScheduleItem;
  roomName: string;
  timeText: string;
  meta: string;
  conflictTitles: string[];
  busy: boolean;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  return (
    <div className="pointer-events-none absolute left-0 right-10 top-full z-30 mt-1 hidden rounded-lg border border-border bg-popover p-2 text-left text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tabular-nums text-primary">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
        {timeText} WIB · {roomName}
        <ConflictMark titles={conflictTitles} />
        {!item.isActive && <Badge variant="outline" className="text-[9px] text-muted-foreground">Draft</Badge>}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">{item.title}</p>
      {meta && <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p>}
      {item.languages.length > 0 && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">Languages:</span> {formatMetadataList(item.languages)}
        </p>
      )}
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground/80">Level:</span>{" "}
        {formatMetadataList(item.levels) || "Not specified"}
      </p>
      <div className="pointer-events-auto mt-1.5 flex items-center gap-1">
        <EditButton item={item} onEdit={onEdit} compact />
        <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
      </div>
    </div>
  );
}

function GridCard({
  item,
  roomName,
  top,
  height,
  conflictTitles,
  formatName,
  busy,
  onEdit,
  onToggleInclude,
}: {
  item: EventScheduleItem;
  roomName: string;
  top: number;
  height: number;
  conflictTitles: string[];
  formatName?: string;
  busy: boolean;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  const conflict = conflictTitles.length > 0;
  const meta = metaLine(item, formatName);
  const timeText = wibTimeOf(item);
  const fullName = [roomName, `${timeText} WIB`, item.title, meta].filter(Boolean).join(" · ");

  // Too short for any text: accent bar + full-name button + hover/focus popover.
  if (height < CARD_LINE_PX) {
    return (
      <article
        className={`group absolute left-1 right-1 rounded border-l-[3px] ${
          conflict
            ? "border-l-destructive bg-destructive/25 ring-1 ring-destructive"
            : item.isServiceSession
              ? "border-l-border bg-muted/60"
              : "border-l-primary/80 bg-card"
        }`}
        style={{ top, height }}
      >
        <button
          type="button"
          onClick={() => onEdit(item)}
          title={`${timeText} WIB · ${item.title}`}
          aria-label={`${fullName}. Activate to edit.`}
          className="h-full w-full cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <CardPopover
          item={item}
          roomName={roomName}
          timeText={timeText}
          meta={meta}
          conflictTitles={conflictTitles}
          busy={busy}
          onEdit={onEdit}
          onToggleInclude={onToggleInclude}
        />
      </article>
    );
  }

  // One line: time + title, micro actions; details via title attribute and popover-free truncation.
  if (height < 64) {
    return (
      <article
        title={fullName}
        className={`group absolute left-1.5 right-1.5 flex items-center gap-2 overflow-hidden rounded-lg border px-2 ${
          item.isServiceSession ? "border-dashed border-border bg-muted/40" : "bg-card border-border/80"
        } ${conflict ? "ring-2 ring-destructive" : ""}`}
        style={{ top, height }}
      >
        <p className="flex shrink-0 items-center gap-1 text-[10px] font-bold tabular-nums text-primary">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">{roomName}. </span>
          {timeText}
          <ConflictMark titles={conflictTitles} />
        </p>
        <p className={`min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight ${item.isActive ? "text-foreground" : "text-muted-foreground"}`}>
          {item.title}
        </p>
        {!item.isActive && <Badge variant="outline" className="shrink-0 text-[9px] text-muted-foreground">Draft</Badge>}
        {meta && <span className="sr-only">{meta}</span>}
        <div className="flex shrink-0 items-center gap-0.5">
          <EditButton item={item} onEdit={onEdit} micro />
          <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} micro />
        </div>
      </article>
    );
  }

  const compact = height < 64;
  return (
    <article
      className={`absolute left-1.5 right-1.5 rounded-lg border px-2.5 py-1.5 overflow-hidden ${
        item.isServiceSession
          ? "border-dashed border-border bg-muted/40"
          : "bg-card border-border/80"
      } ${conflict ? "ring-2 ring-destructive" : ""}`}
      style={{ top, height }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold tabular-nums text-primary">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="sr-only">{roomName}. </span>
        {wibTimeOf(item)} WIB
        <ConflictMark titles={conflictTitles} />
        <span className="ml-auto flex items-center gap-1">
          {!item.isActive && <Badge variant="outline" className="text-[9px] text-muted-foreground">Draft</Badge>}
        </span>
      </div>
      <p className={`text-xs font-semibold leading-snug line-clamp-2 mt-0.5 ${item.isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {item.title}
      </p>
      {meta && <p className={`text-[10px] text-muted-foreground mt-0.5 truncate ${compact ? "sr-only" : ""}`}>{meta}</p>}
      <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
        <EditButton item={item} onEdit={onEdit} compact />
        <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
      </div>
    </article>
  );
}

function TrayRow({
  item,
  rooms,
  formatName,
  conflictTitles,
  busy,
  onEdit,
  onToggleInclude,
}: {
  item: EventScheduleItem;
  rooms: ScheduleRoom[];
  formatName?: string;
  conflictTitles: string[];
  busy: boolean;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl border border-border/70 bg-card/70">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug text-foreground line-clamp-3 break-words" title={item.title}>{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <ConflictMark titles={conflictTitles} />
          {item.sessionId && (
            <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/20 font-mono shrink-0">
              Sessionize
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
          {[
            roomLabel(item, rooms) || "No room",
            speakersLine(item),
            formatName,
            formatMetadataList(item.languages),
            formatMetadataList(item.levels),
            !isScheduled(item) ? "No time set" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
      <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(item)} aria-label={`Schedule ${item.title}`} title={`Schedule ${item.title}`} className="h-8 w-8 p-0 shrink-0">
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function ListRow({
  item,
  rooms,
  formatName,
  conflictTitles,
  busy,
  onEdit,
  onToggleInclude,
}: {
  item: EventScheduleItem;
  rooms: ScheduleRoom[];
  formatName?: string;
  conflictTitles: string[];
  busy: boolean;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  return (
    <article className="p-3 rounded-xl border border-border/80 bg-card/70">
      <p className="flex items-center gap-2 text-[10px] font-bold tabular-nums text-primary">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
        {wibTimeOf(item)} WIB
        <ConflictMark titles={conflictTitles} />
        <span className="ml-auto flex items-center gap-1">
          {!item.isActive && <Badge variant="outline" className="text-[9px] text-muted-foreground">Draft</Badge>}
        </span>
      </p>
      <p className={`text-sm font-bold leading-snug mt-1 ${item.isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {item.title}
      </p>
      <div className="flex items-end justify-between gap-2 mt-0.5">
        <p className="text-[11px] text-muted-foreground min-w-0">
          {[
            item.allRooms ? "All rooms" : roomLabel(item, rooms) || "No room",
            formatName,
            speakersLine(item),
            formatMetadataList(item.languages),
            formatMetadataList(item.levels),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          <EditButton item={item} onEdit={onEdit} />
          <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
        </div>
      </div>
    </article>
  );
}
