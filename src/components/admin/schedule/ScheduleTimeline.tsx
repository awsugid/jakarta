"use client";

import { createContext, useContext, useMemo, useState } from "react";
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
import { roomLabel } from "@/lib/schedule-workspace";
import {
  PX_PER_MIN,
  activeRooms,
  axisRange,
  buildConflictMap,
  dayLabel,
  hourTicks,
  isScheduled,
  minuteLabel,
  wibDay,
  wibMinutes,
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
      <div className={`grid min-w-0 gap-4 ${trayOpen ? "xl:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
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
            const range = axisRange(dayItems);
            if (!range) return null;
            return (
              <section key={day} aria-label={`Schedule for ${dayLabel(day)}`}>
                <h3 className="text-sm font-bold text-foreground mb-3">{dayLabel(day)}</h3>
                <DayGrid
                  dayItems={dayItems}
                  rooms={liveRooms}
                  range={range}
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
}: {
  item: EventScheduleItem;
  busy: boolean;
  onToggleInclude: (item: EventScheduleItem) => void;
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
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
        item.isActive
          ? "text-emerald-400 hover:bg-emerald-500/10"
          : "text-muted-foreground/60 hover:bg-muted/70"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}

function EditButton({
  item,
  onEdit,
  compact = false,
}: {
  item: EventScheduleItem;
  onEdit: (item: EventScheduleItem) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-label={`Edit ${item.title}`}
      title="Edit session"
      className={`inline-flex items-center justify-center gap-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
        compact ? "h-7 w-7" : "h-7 px-2 text-[11px] font-semibold"
      }`}
    >
      <Pencil className={compact ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {!compact && <span>Edit</span>}
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
  return [speakersLine(item), formatName, item.isServiceSession ? "Service" : ""].filter(Boolean).join(" · ");
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
  conflicts,
  formatName,
  busyId,
  onEdit,
  onToggleInclude,
}: {
  dayItems: EventScheduleItem[];
  rooms: ScheduleRoom[];
  range: { startMin: number; endMin: number; height: number };
  conflicts: Map<string, string[]>;
  formatName: Map<string, string>;
  busyId: string | null;
  onEdit: (item: EventScheduleItem) => void;
  onToggleInclude: (item: EventScheduleItem) => void;
}) {
  const startMin = range.startMin;
  const ticks = hourTicks(range);
  function pos(item: EventScheduleItem): { top: number; height: number } | null {
    const s = wibMinutes(item.startsAt);
    const e = wibMinutes(item.endsAt);
    if (s === null || e === null || e <= s) return null;
    return { top: (s - startMin) * PX_PER_MIN, height: Math.max((e - s) * PX_PER_MIN, 30) };
  }

  const columnItems = dayItems.filter((it) => !it.allRooms);
  const bandItems = dayItems.filter((it) => it.allRooms);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/40 overflow-hidden">
      {/* Header row */}
      <div className="flex border-b border-border/80 bg-muted/30">
        <div style={{ width: GUTTER_PX }} className="shrink-0" aria-hidden="true" />
        {rooms.map((room) => (
          <div key={room.id} className="flex-1 min-w-[150px] px-2 py-2 text-center text-xs font-semibold text-foreground truncate border-l border-border/60">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-purple-400 shrink-0" aria-hidden="true" />
              {room.name}
            </span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="relative overflow-x-auto">
        <div className="relative flex" style={{ height: range.height, minWidth: "fit-content" }}>
          {/* Time gutter */}
          <div className="relative shrink-0 border-r border-border/60" style={{ width: GUTTER_PX }}>
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground"
                style={{ top: (t - startMin) * PX_PER_MIN }}
              >
                {minuteLabel(t)}
              </span>
            ))}
          </div>

          {/* Room columns with hour lines */}
          {rooms.map((room) => (
            <div key={room.id} className="relative flex-1 min-w-[150px] border-l border-border/60">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px 96px)",
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
                className="absolute rounded-lg border border-dashed border-primary/40 bg-primary/10 px-3 py-1.5 z-10 backdrop-blur-[1px] flex items-start gap-2"
                style={{ top: p.top, height: p.height, left: GUTTER_PX, right: 0 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[10px] font-bold tabular-nums text-primary">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {wibTimeOf(item)} WIB · All rooms
                    <ConflictMark titles={conflicts.get(item.id) ?? []} />
                    {!item.isActive && <Badge variant="outline" className="text-[9px] text-muted-foreground">Draft</Badge>}
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                  {meta && <p className={`text-[10px] text-muted-foreground truncate ${p.height < 52 ? "sr-only" : ""}`}>{meta}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <EditButton item={item} onEdit={onEdit} compact />
                  <IncludeButton item={item} busy={busyId === item.id} onToggleInclude={onToggleInclude} />
                </div>
              </article>
            );
          })}
        </div>
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
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card/70">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
          {item.title}
          <ConflictMark titles={conflictTitles} />
          {item.sessionId && (
            <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/20 font-mono shrink-0">
              Sessionize
            </Badge>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {roomLabel(item, rooms) || "No room"}
          {speakersLine(item) ? ` · ${speakersLine(item)}` : ""}
          {formatName ? ` · ${formatName}` : ""}
          {!isScheduled(item) ? " · No time set" : ""}
        </p>
      </div>
      <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
      <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(item)} className="h-7 text-[11px] px-2.5 shrink-0">
        <Pencil className="h-3 w-3 mr-1" aria-hidden="true" />
        Schedule
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
          {item.allRooms ? "All rooms" : roomLabel(item, rooms) || "No room"}
          {formatName ? ` · ${formatName}` : ""}
          {speakersLine(item) ? ` · ${speakersLine(item)}` : ""}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          <EditButton item={item} onEdit={onEdit} />
          <IncludeButton item={item} busy={busy} onToggleInclude={onToggleInclude} />
        </div>
      </div>
    </article>
  );
}
