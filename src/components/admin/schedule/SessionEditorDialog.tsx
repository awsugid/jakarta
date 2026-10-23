"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createAdminScheduleItem,
  createAdminSpeaker,
  createScheduleFormat,
  updateAdminScheduleItem,
} from "@/lib/api";
import type {
  EventScheduleItem,
  EventSpeaker,
  ScheduleFormat,
  ScheduleRoom,
} from "@/lib/types";
import { localInputToWibRfc3339, shareRoom, wibToLocalInput } from "@/lib/schedule-workspace";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";
import { LANGUAGE_SUGGESTIONS, LEVEL_SUGGESTIONS, metadataListError } from "@/lib/schedule-metadata";
import { MetadataField } from "@/components/admin/schedule/MetadataField";
import { cn } from "@/lib/utils";

/** Backend returns speakerIds on items; lib types not updated yet (owned elsewhere). */
export type ItemWithSpeakerRefs = EventScheduleItem & { speakerIds?: string[] };

interface SessionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventSlug: string;
  item: ItemWithSpeakerRefs | null;
  rooms: ScheduleRoom[]; // active rooms, display order
  formats: ScheduleFormat[]; // active-first
  speakers: EventSpeaker[]; // directory for this event
  peers: EventScheduleItem[]; // other items, for conflict warnings
  onSaved: () => void | Promise<void>;
  onDelete?: (item: ItemWithSpeakerRefs) => void | Promise<void>;
  onSpeakerCreated: (speaker: EventSpeaker) => void;
  onDirtyChange: (dirty: boolean) => void;
}

interface AdhocSpeakerForm {
  name: string;
  role: string;
  company: string;
}

interface FormState {
  title: string;
  description: string;
  formatId: string;
  allRooms: boolean;
  roomIds: string[];
  // WIB wall clock, split so a half-filled schedule is not lost while typing.
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endDate: string; // "" = same day as start
  endTime: string;
  speakerIds: string[];
  adhoc: AdhocSpeakerForm[];
  isServiceSession: boolean;
  isActive: boolean;
  // [] = not set. Never defaulted; saved verbatim.
  languages: string[];
  levels: string[];
}

// ---- WIB time helpers (pure; exported for the self-check) -------------------

/** "YYYY-MM-DD" + "HH:MM" -> datetime-local string, or "" when either part is missing/malformed. */
export function joinWib(date: string, time: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}` : "";
}

/** Shift a WIB wall-clock date+time by N minutes (crosses midnight correctly). */
export function addMinutesWib(date: string, time: string, minutes: number): { date: string; time: string } | null {
  const local = joinWib(date, time);
  if (!local) return null;
  // Treat wall clock as UTC: offset-free arithmetic, host timezone irrelevant.
  const iso = new Date(Date.parse(`${local}:00Z`) + minutes * 60_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Whole minutes between two datetime-local strings; null when either is empty. */
export function minutesBetween(startLocal: string, endLocal: string): number | null {
  if (!startLocal || !endLocal) return null;
  const s = Date.parse(`${startLocal}:00Z`);
  const e = Date.parse(`${endLocal}:00Z`);
  return Number.isNaN(s) || Number.isNaN(e) ? null : Math.round((e - s) / 60_000);
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}

/**
 * True when an open inline sub-form holds input the user typed. Compared against the
 * values present when the panel opened, so prefills/defaults never count as edits.
 */
export function hasPendingSubform(
  open: boolean,
  values: Record<string, string>,
  atOpen: Record<string, string> = {},
): boolean {
  return open && Object.keys(values).some((k) => values[k].trim() !== (atOpen[k] ?? "").trim());
}

const DURATIONS = [15, 30, 45, 60, 90];
const RESULT_LIMIT = 6;

function initialState(item: ItemWithSpeakerRefs | null): FormState {
  if (!item) {
    return {
      title: "",
      description: "",
      formatId: "",
      allRooms: false,
      roomIds: [],
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      speakerIds: [],
      adhoc: [],
      isServiceSession: false,
      isActive: false, // docs: unscheduled excluded — drafts start excluded
      languages: [],
      levels: [],
    };
  }
  const s = wibToLocalInput(item.startsAt);
  const e = wibToLocalInput(item.endsAt);
  return {
    title: item.title,
    description: item.description || "",
    formatId: item.formatId || "",
    allRooms: item.allRooms,
    roomIds: item.allRooms ? [] : [...(item.roomIds || [])],
    startDate: s.slice(0, 10),
    startTime: s.slice(11, 16),
    endDate: e.slice(0, 10),
    endTime: e.slice(11, 16),
    speakerIds: [...(item.speakerIds || [])],
    adhoc: normalizeScheduleSpeakers(item).map((sp) => ({
      name: sp.name,
      role: sp.role || "",
      company: sp.company || "",
    })),
    isServiceSession: item.isServiceSession,
    isActive: item.isActive,
    languages: [...(item.languages ?? [])],
    levels: [...(item.levels ?? [])],
  };
}

const emptyAdhoc: AdhocSpeakerForm = { name: "", role: "", company: "" };

/** Enter inside a nested sub-form must not submit the outer session form. */
function onEnter(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      fn();
    }
  };
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function SwitchRow({
  id,
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform duration-150",
            checked ? "translate-x-[18px] bg-primary-foreground" : "translate-x-[2px] bg-foreground/80",
          )}
        />
      </button>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium leading-5 text-foreground">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-1.5 text-xs leading-snug",
        tone === "error" ? "text-destructive" : "text-amber-400",
      )}
    >
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function SessionEditorDialog({
  open,
  onOpenChange,
  eventSlug,
  item,
  rooms,
  formats,
  speakers,
  peers,
  onSaved,
  onDelete,
  onSpeakerCreated,
  onDirtyChange,
}: SessionEditorDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(item));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [adhocOpen, setAdhocOpen] = useState(false);

  const [query, setQuery] = useState("");
  // Directory speaker creation (persists immediately, independent of session save)
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [spkName, setSpkName] = useState("");
  const [spkRole, setSpkRole] = useState("Speaker");
  const [spkCompany, setSpkCompany] = useState("");
  const [spkPhotoUrl, setSpkPhotoUrl] = useState("");
  const [spkSaving, setSpkSaving] = useState(false);
  const [spkError, setSpkError] = useState<string | null>(null);
  // Inline format creation (persists immediately)
  const [showNewFormat, setShowNewFormat] = useState(false);
  const [newFormatName, setNewFormatName] = useState("");
  const [formatSaving, setFormatSaving] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  // ponytail: created formats are merged locally; parent's list catches up on its next
  // loadAll (after session save). Calling onSaved here would remount the parent's
  // Rooms/Formats panels and drop their unsaved edits. Add an onFormatCreated prop if needed.
  const [createdFormats, setCreatedFormats] = useState<ScheduleFormat[]>([]);
  const baseline = useRef<FormState>(initialState(item));
  const speakerAtOpen = useRef<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init = initialState(item);
      setForm(init);
      baseline.current = init;
      setFormError(null);
      setDescOpen(false);
      setAdhocOpen(false);

      setQuery("");
      setShowAddSpeaker(false);
      setSpkError(null);
      setShowNewFormat(false);
      setNewFormatName("");
      setFormatError(null);
      onDirtyChange(false);
    }
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const speakerDraft = { name: spkName, role: spkRole, company: spkCompany, photoUrl: spkPhotoUrl };
  const subformDirty =
    hasPendingSubform(showAddSpeaker, speakerDraft, speakerAtOpen.current) ||
    hasPendingSubform(showNewFormat, { name: newFormatName });
  const dirty = open
    ? JSON.stringify(form) !== JSON.stringify(baseline.current) || subformDirty
    : false;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleRoom(id: string) {
    setForm((f) => ({
      ...f,
      allRooms: false,
      roomIds: f.roomIds.includes(id) ? f.roomIds.filter((r) => r !== id) : [...f.roomIds, id],
    }));
  }

  function addSpeaker(id: string) {
    setForm((f) => (f.speakerIds.includes(id) ? f : { ...f, speakerIds: [...f.speakerIds, id] }));
  }

  function removeSpeaker(id: string) {
    setForm((f) => ({ ...f, speakerIds: f.speakerIds.filter((s) => s !== id) }));
  }

  function setDate(date: string) {
    // Moving the day carries a same-day end along; a deliberate multi-day end stays put.
    setForm((f) => ({
      ...f,
      startDate: date,
      endDate: !f.endDate || f.endDate === f.startDate ? date : f.endDate,
    }));
  }

  function setDuration(mins: number) {
    const end = addMinutesWib(form.startDate, form.startTime, mins);
    if (end) patch({ endDate: end.date, endTime: end.time });
  }

  const startsAt = joinWib(form.startDate, form.startTime);
  const endsAt = joinWib(form.endDate || form.startDate, form.endTime);
  const anyTime = Boolean(form.startDate || form.startTime || form.endTime);
  const partialSchedule = anyTime && (!startsAt || !endsAt);
  const multiDay = Boolean(form.endDate && form.startDate && form.endDate !== form.startDate);
  const timeInvalid = Boolean(startsAt && endsAt && startsAt >= endsAt);
  const duration = timeInvalid ? null : minutesBetween(startsAt, endsAt);
  const includedButUnscheduled = form.isActive && (!startsAt || !endsAt);
  const noRoom = !form.allRooms && form.roomIds.length === 0;


  const conflictTitles = useMemo(() => {
    if (!startsAt || !endsAt || timeInvalid) return [];
    const s = Date.parse(localInputToWibRfc3339(startsAt));
    const e = Date.parse(localInputToWibRfc3339(endsAt));
    if (Number.isNaN(s) || Number.isNaN(e)) return [];
    const cand = { roomIds: form.roomIds, allRooms: form.allRooms };
    return peers
      .filter((p) => p.id !== item?.id && p.startsAt && p.endsAt)
      .filter((p) => {
        const ps = Date.parse(p.startsAt!);
        const pe = Date.parse(p.endsAt!);
        if (Number.isNaN(ps) || Number.isNaN(pe)) return false;
        return s < pe && ps < e && shareRoom(cand, p);
      })
      .map((p) => p.title);
  }, [startsAt, endsAt, form.roomIds, form.allRooms, peers, item, timeInvalid]);

  const speakerById = useMemo(() => new Map(speakers.map((s) => [s.id, s])), [speakers]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return speakers.filter(
      (s) =>
        !form.speakerIds.includes(s.id) &&
        (!q || [s.name, s.role, s.company].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [speakers, form.speakerIds, query]);
  const shown = matches.slice(0, RESULT_LIMIT);

  const formatOptions = useMemo(() => {
    const ids = new Set(formats.map((f) => f.id));
    return [...formats, ...createdFormats.filter((f) => !ids.has(f.id))].sort(
      (a, b) => Number(a.archived) - Number(b.archived) || a.displayOrder - b.displayOrder,
    );
  }, [formats, createdFormats]);
  const currentFormat = formatOptions.find((f) => f.id === form.formatId);

  function requestClose(next: boolean) {
    if (next) return;
    // Closing mid-save would drop the error (and the edits) if the save fails.
    if (submitting) return;
    if (dirty && !window.confirm("Discard unsaved changes to this session?")) return;
    onOpenChange(false);
  }

  function openAddSpeaker() {
    const name = !spkName.trim() && query.trim() ? query.trim() : spkName;
    setSpkName(name);
    speakerAtOpen.current = { ...speakerDraft, name };
    setSpkError(null);
    setShowAddSpeaker(true);
  }

  async function handleAddSpeaker() {
    if (!spkName.trim() || !spkRole.trim() || !spkPhotoUrl.trim()) {
      setSpkError("Name, role, and photo URL are required by the speaker directory.");
      return;
    }
    setSpkSaving(true);
    setSpkError(null);
    try {
      const created = await createAdminSpeaker(eventSlug, {
        name: spkName.trim(),
        role: spkRole.trim(),
        company: spkCompany.trim() || null,
        photoUrl: spkPhotoUrl.trim(),
      });
      onSpeakerCreated(created);
      addSpeaker(created.id);
      setSpkName("");
      setSpkCompany("");
      setSpkPhotoUrl("");
      setQuery("");
      setShowAddSpeaker(false);
    } catch (err: any) {
      setSpkError(err?.message || "Failed to create speaker");
    } finally {
      setSpkSaving(false);
    }
  }

  async function handleAddFormat() {
    const name = newFormatName.trim();
    if (!name) {
      setFormatError("Enter a format name.");
      return;
    }
    if (formatOptions.some((f) => f.name.trim().toLowerCase() === name.toLowerCase())) {
      setFormatError("A format with this name already exists.");
      return;
    }
    setFormatSaving(true);
    setFormatError(null);
    try {
      const created = await createScheduleFormat(eventSlug, { name, displayOrder: formatOptions.length });
      setCreatedFormats((prev) => [...prev, created]);
      patch({ formatId: created.id });
      setNewFormatName("");
      setShowNewFormat(false);
    } catch (err: any) {
      setFormatError(err?.message || "Failed to create format");
    } finally {
      setFormatSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (timeInvalid) {
      setFormError("End time must be after start time (WIB).");
      return;
    }
    const { languages, levels } = form;
    const metadataError = metadataListError(languages) ?? metadataListError(levels);
    if (metadataError) {
      setFormError(metadataError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const base = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      formatId: form.formatId, // "" clears the format
      roomIds: form.allRooms ? [] : form.roomIds,
      allRooms: form.allRooms,
      speakerIds: form.speakerIds,
      speakers: form.adhoc
        .filter((s) => s.name.trim())
        .map((s) => ({ name: s.name.trim(), role: s.role.trim() || undefined, company: s.company.trim() || undefined })),
      // "" clears the stored time on update (Some("")); a value sets it.
      startsAt: localInputToWibRfc3339(startsAt),
      endsAt: localInputToWibRfc3339(endsAt),
      isServiceSession: form.isServiceSession,
      isActive: form.isActive,
      languages,
      levels,
    };
    try {
      if (item) {
        await updateAdminScheduleItem(eventSlug, item.id, { ...base, revision: item.revision });
      } else {
        await createAdminScheduleItem(eventSlug, { ...base, displayOrder: peers.length });
      }
      onDirtyChange(false);
      onOpenChange(false);
      await onSaved();
    } catch (err: any) {
      // Keep the dialog open with all inputs intact.
      setFormError(
        err?.message ||
          "Failed to save — the session may have been edited by someone else. Copy your changes, reload, and retry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const sectionTitle = "text-sm font-semibold text-foreground";
  const chip =
    "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const chipOn = "border-primary/60 bg-primary/15 text-foreground";
  const chipOff = "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground";
  const dateInput = "[color-scheme:dark] tabular-nums";

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-3xl max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(54rem,calc(100dvh-4rem))]">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
          <DialogTitle>{item ? "Edit Session" : "New Session"}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {item
              ? "Changes stay private until you review and publish. Conflicts save as drafts but block publishing."
              : "Incomplete sessions save as drafts. Nothing is published until you review and publish."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2 [&>*]:min-w-0">
              {/* Essentials */}
              <section aria-labelledby="sess-essentials" className="space-y-4">
                <h3 id="sess-essentials" className={sectionTitle}>
                  Essentials
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="sess-title">
                    Title <span className="text-primary" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="sess-title"
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="e.g. Architecting for the Future"
                    aria-required="true"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="sess-format">Format</Label>
                    {!showNewFormat && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormatError(null);
                          setShowNewFormat(true);
                        }}
                        className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        New format
                      </button>
                    )}
                  </div>
                  <Select value={form.formatId || "none"} onValueChange={(v) => patch({ formatId: v === "none" ? "" : v })}>
                    <SelectTrigger id="sess-format" className="min-w-0 [&>span]:truncate">
                      <SelectValue placeholder="No format" />
                    </SelectTrigger>
                    {/* Base SelectContent is z-50; the dialog layer is z-[200]. */}
                    <SelectContent className="z-[210]">
                      <SelectItem value="none">No format</SelectItem>
                      {formatOptions.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                          {f.archived ? " (archived)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentFormat?.archived && (
                    <Notice tone="warn">This format is archived — pick an active one before publishing.</Notice>
                  )}
                  {showNewFormat && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex min-w-0 gap-2">
                        <Input
                          aria-label="New format name"
                          value={newFormatName}
                          onChange={(e) => setNewFormatName(e.target.value)}
                          onKeyDown={onEnter(handleAddFormat)}
                          placeholder="e.g. Lightning talk"
                          className="h-9 min-w-0 flex-1"
                          autoFocus
                          disabled={formatSaving}
                        />
                        <Button type="button" size="sm" onClick={handleAddFormat} disabled={formatSaving} className="h-9 shrink-0">
                          {formatSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Add"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Cancel new format"
                          onClick={() => setShowNewFormat(false)}
                          disabled={formatSaving}
                          className="h-9 w-9 shrink-0 p-0"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Added to the event's formats right away.</p>
                      {formatError && <Notice tone="error">{formatError}</Notice>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-3 sm:grid-cols-2 [&>*]:min-w-0">
                  <MetadataField
                    label="Language"
                    values={form.languages}
                    onChange={(languages) => patch({ languages })}
                    suggestions={LANGUAGE_SUGGESTIONS}
                    placeholder="Other language"
                    hint="Select all that apply. Leave empty if unknown."
                  />
                  <MetadataField
                    label="Level"
                    values={form.levels}
                    onChange={(levels) => patch({ levels })}
                    suggestions={LEVEL_SUGGESTIONS}
                    placeholder="e.g. 100 - Introductory"
                    hint="Add level manually if Sessionize does not provide it."
                  />
                </div>

                <SwitchRow
                  id="sess-service"
                  checked={form.isServiceSession}
                  onCheckedChange={(v) => patch({ isServiceSession: v })}
                  label="Service session"
                  hint="Break, lunch, registration — no speakers needed."
                />

                {descOpen || form.description ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="sess-desc">Description</Label>
                    <Textarea
                      id="sess-desc"
                      rows={3}
                      value={form.description}
                      onChange={(e) => {
                        setDescOpen(true); // keep the field mounted when cleared
                        patch({ description: e.target.value });
                      }}
                      placeholder="Session abstract shown on the public schedule…"
                      autoFocus={descOpen && !form.description}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDescOpen(true)}
                    className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add description
                  </button>
                )}
              </section>

              {/* Scheduling */}
              <section aria-labelledby="sess-schedule" className="space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 id="sess-schedule" className={sectionTitle}>
                    Schedule
                  </h3>
                  <span className="text-xs text-muted-foreground">WIB · UTC+7</span>
                </div>

                <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="sess-date">Date</Label>
                    <Input
                      id="sess-date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setDate(e.target.value)}
                      className={dateInput}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sess-start">Starts</Label>
                    <Input
                      id="sess-start"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => patch({ startTime: e.target.value })}
                      className={dateInput}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sess-end">Ends</Label>
                    <Input
                      id="sess-end"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => patch({ endTime: e.target.value })}
                      aria-invalid={timeInvalid || undefined}
                      className={cn(dateInput, timeInvalid && "border-destructive")}
                    />
                  </div>
                  {multiDay && (
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="sess-end-date">Ends on</Label>
                      <Input
                        id="sess-end-date"
                        type="date"
                        value={form.endDate}
                        onChange={(e) => patch({ endDate: e.target.value })}
                        className={dateInput}
                      />
                    </div>
                  )}
                </div>

                {form.startDate && form.startTime && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Set duration">
                    {DURATIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={duration === m}
                        onClick={() => setDuration(m)}
                        className={cn(chip, "px-2 py-1 tabular-nums", duration === m ? chipOn : chipOff)}
                      >
                        {formatDuration(m)}
                      </button>
                    ))}
                    {duration !== null && !DURATIONS.includes(duration) && (
                      <span className="text-xs tabular-nums text-muted-foreground">{formatDuration(duration)}</span>
                    )}
                  </div>
                )}

                <div aria-live="polite" className="space-y-1.5 empty:hidden">
                  {timeInvalid && <Notice tone="error">End time must be after start time.</Notice>}
                  {partialSchedule && !timeInvalid && (
                    <Notice tone="warn">Set date, start and end to schedule — otherwise this saves unscheduled.</Notice>
                  )}
                  {includedButUnscheduled && !partialSchedule && (
                    <Notice tone="warn">Included in publication but unscheduled — this blocks publishing until times are set.</Notice>
                  )}
                </div>
                {anyTime && (
                  <button
                    type="button"
                    onClick={() => patch({ startDate: "", startTime: "", endDate: "", endTime: "" })}
                    className="rounded text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear time (unschedule)
                  </button>
                )}

                <fieldset className="min-w-0 space-y-2.5 pt-1">
                  <legend className="mb-2 text-sm font-medium text-foreground">Rooms</legend>
                  <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Room mode">
                    {[
                      { all: false, label: "Specific rooms" },
                      { all: true, label: "All rooms" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        aria-pressed={form.allRooms === opt.all}
                        onClick={() => patch({ allRooms: opt.all, roomIds: opt.all ? [] : form.roomIds })}
                        className={cn(
                          "rounded px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          form.allRooms === opt.all
                            ? "bg-secondary text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {form.allRooms ? (
                    <p className="text-xs text-muted-foreground">Shared event / plenum — occupies every room.</p>
                  ) : rooms.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active rooms — add rooms in the Rooms panel first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rooms">
                      {rooms.map((room) => {
                        const on = form.roomIds.includes(room.id);
                        return (
                          <button
                            key={room.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleRoom(room.id)}
                            className={cn(chip, on ? chipOn : chipOff)}
                          >
                            {on && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
                            <span className="truncate">{room.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {noRoom && <Notice tone="warn">No room assigned — saves as draft, excluded from publication.</Notice>}
                  {conflictTitles.length > 0 && (
                    <Notice tone="warn">
                      Overlaps “{conflictTitles.join("”, “")}” in a shared room. Saves anyway, but review will flag it.
                    </Notice>
                  )}
                </fieldset>
              </section>

              {/* Speakers */}
              <section aria-labelledby="sess-speakers" className="space-y-4 border-t border-border pt-6 md:col-span-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 id="sess-speakers" className={sectionTitle}>
                    Speakers
                    {form.speakerIds.length > 0 && (
                      <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">{form.speakerIds.length}</span>
                    )}
                  </h3>
                  {form.isServiceSession && <span className="text-xs text-muted-foreground">Optional for service sessions</span>}
                </div>

                {form.speakerIds.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label="Selected speakers">
                    {form.speakerIds.map((id) => {
                      const spk = speakerById.get(id);
                      const name = spk?.name || "Removed speaker";
                      return (
                        <li
                          key={id}
                          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-1 pl-1 pr-1"
                        >
                          <Avatar className="h-6 w-6 shrink-0 rounded-full">
                            <AvatarImage src={spk?.photoUrl || undefined} alt="" className="object-cover" />
                            <AvatarFallback className="text-[10px] font-bold">{initials(name)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 truncate text-xs font-medium text-foreground" title={spk ? `${spk.name} · ${spk.role}` : id}>
                            {name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSpeaker(id)}
                            aria-label={`Remove ${name}`}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {speakers.length > 0 && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="search"
                        aria-label="Search speaker directory"
                        aria-controls="sess-speaker-results"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onEnter(() => {
                          if (shown[0]) {
                            addSpeaker(shown[0].id);
                            setQuery("");
                          }
                        })}
                        placeholder={`Search ${speakers.length} speakers by name, company or talk`}
                        className="pl-9"
                        autoComplete="off"
                      />
                    </div>
                    <ul id="sess-speaker-results" className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                      {shown.map((spk) => (
                        <li key={spk.id}>
                          <button
                            type="button"
                            onClick={() => addSpeaker(spk.id)}
                            className="group flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
                          >
                            <Avatar className="h-8 w-8 shrink-0 rounded-full border border-border">
                              <AvatarImage src={spk.photoUrl || undefined} alt="" className="object-cover" />
                              <AvatarFallback className="text-[10px] font-bold">{initials(spk.name)}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">{spk.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {[spk.role, spk.company].filter(Boolean).join(" · ")}

                              </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100">
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">Add</span>
                              <span className="sr-only sm:hidden">Add {spk.name}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                      {shown.length === 0 && (
                        <li className="px-3 py-3 text-xs text-muted-foreground">
                          {query.trim() ? `No directory speaker matches “${query.trim()}”.` : "Every directory speaker is already selected."}
                        </li>
                      )}
                    </ul>
                    {matches.length > shown.length && (
                      <p className="text-xs text-muted-foreground">
                        {matches.length - shown.length} more — refine the search to narrow down.
                      </p>
                    )}
                  </div>
                )}

                {showAddSpeaker ? (
                  <div
                    className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 sm:p-4"
                    onKeyDown={onEnter(() => void handleAddSpeaker())}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">New directory speaker</p>
                        <p className="text-xs text-muted-foreground">
                          Saved to the speaker directory <strong className="text-foreground">immediately</strong> — it stays even if you
                          cancel this session.
                        </p>
                      </div>
                      <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border">
                        <AvatarImage src={spkPhotoUrl.trim() || undefined} alt="" className="object-cover" />
                        <AvatarFallback className="text-xs font-bold">{initials(spkName)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
                      <div className="space-y-1">
                        <Label htmlFor="spk-name" className="text-xs">Name *</Label>
                        <Input id="spk-name" value={spkName} onChange={(e) => setSpkName(e.target.value)} placeholder="e.g. Arief Nugraha" autoFocus />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="spk-role" className="text-xs">Role *</Label>
                        <Input id="spk-role" value={spkRole} onChange={(e) => setSpkRole(e.target.value)} placeholder="e.g. Senior Solutions Architect" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="spk-company" className="text-xs">Company</Label>
                        <Input id="spk-company" value={spkCompany} onChange={(e) => setSpkCompany(e.target.value)} placeholder="e.g. AWS" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="spk-photo" className="text-xs">Photo URL *</Label>
                        <Input id="spk-photo" inputMode="url" value={spkPhotoUrl} onChange={(e) => setSpkPhotoUrl(e.target.value)} placeholder="https://…" />
                      </div>
                    </div>
                    {spkError && <Notice tone="error">{spkError}</Notice>}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => void handleAddSpeaker()} disabled={spkSaving}>
                        {spkSaving ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        )}
                        Save speaker &amp; select
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddSpeaker(false)} disabled={spkSaving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openAddSpeaker}
                    className="inline-flex max-w-full items-center gap-1.5 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {speakers.length === 0
                        ? "No directory speakers yet — create one"
                        : query.trim() && shown.length === 0
                          ? `Create “${query.trim()}” in the directory`
                          : "Not listed? Create a directory speaker"}
                    </span>
                  </button>
                )}

                {/* Ad-hoc presenters */}
                <div className="rounded-lg border border-border">
                  <button
                    type="button"
                    aria-expanded={adhocOpen}
                    aria-controls="sess-adhoc"
                    onClick={() => setAdhocOpen((v) => !v)}
                    className="flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", adhocOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      Other presenters <span className="font-normal text-muted-foreground">(not in directory)</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {form.adhoc.length ? form.adhoc.length : "Optional"}
                    </span>
                  </button>
                  {adhocOpen && (
                    <div id="sess-adhoc" className="space-y-3 border-t border-border px-3 pb-3 pt-3">
                      {form.adhoc.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          For co-presenters without a directory profile. Shown by name only.
                        </p>
                      )}
                      {form.adhoc.map((spk, idx) => (
                        <div key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>*]:min-w-0">
                            {(["name", "role", "company"] as const).map((field) => (
                              <div key={field} className="space-y-1">
                                <Label htmlFor={`adhoc-${idx}-${field}`} className="text-xs capitalize">
                                  {field}
                                </Label>
                                <Input
                                  id={`adhoc-${idx}-${field}`}
                                  value={spk[field]}
                                  onChange={(e) =>
                                    setForm((f) => ({
                                      ...f,
                                      adhoc: f.adhoc.map((s, i) => (i === idx ? { ...s, [field]: e.target.value } : s)),
                                    }))
                                  }
                                  placeholder={field === "name" ? "Speaker name" : undefined}
                                />
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove presenter ${spk.name || idx + 1}`}
                            onClick={() => setForm((f) => ({ ...f, adhoc: f.adhoc.filter((_, i) => i !== idx) }))}
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setForm((f) => ({ ...f, adhoc: [...f.adhoc, { ...emptyAdhoc }] }))}
                      >
                        <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Add presenter
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-border bg-background px-5 py-3">
            {formError && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs text-foreground">
                {formError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <SwitchRow
                  id="sess-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => patch({ isActive: v })}
                  label="Include in next publication"
                  hint="Off keeps it a private draft."
                />
              </div>
              <div className="flex items-center gap-2">
                {item && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!window.confirm(`Delete "${form.title}" from the schedule?`)) return;
                      onDirtyChange(false);
                      onOpenChange(false);
                      onDelete(item);
                    }}
                    disabled={submitting}
                    className="mr-auto px-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-0"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Delete</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestClose(false)}
                  disabled={submitting}
                  className={cn(!(item && onDelete) && "ml-auto sm:ml-0")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !form.title.trim() || timeInvalid}>
                  {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {item ? "Save Session" : "Create Draft"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
