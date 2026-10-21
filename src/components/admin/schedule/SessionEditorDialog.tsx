"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAdminScheduleItem, createAdminSpeaker, updateAdminScheduleItem } from "@/lib/api";
import type {
  EventScheduleItem,
  EventSpeaker,
  ScheduleFormat,
  ScheduleRoom,
} from "@/lib/types";
import { localInputToWibRfc3339, shareRoom, wibToLocalInput } from "@/lib/schedule-workspace";
import { normalizeScheduleSpeakers } from "@/lib/schedule-speakers";

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
  startsAt: string; // datetime-local WIB
  endsAt: string;
  speakerIds: string[];
  adhoc: AdhocSpeakerForm[];
  isServiceSession: boolean;
  isActive: boolean;
}

function initialState(item: ItemWithSpeakerRefs | null, peerCount: number): FormState {
  if (!item) {
    return {
      title: "",
      description: "",
      formatId: "",
      allRooms: false,
      roomIds: [],
      startsAt: "",
      endsAt: "",
      speakerIds: [],
      adhoc: [],
      isServiceSession: false,
      isActive: false, // docs: unscheduled excluded — drafts start excluded
    };
  }
  void peerCount;
  return {
    title: item.title,
    description: item.description || "",
    formatId: item.formatId || "",
    allRooms: item.allRooms,
    roomIds: item.allRooms ? [] : [...(item.roomIds || [])],
    startsAt: wibToLocalInput(item.startsAt),
    endsAt: wibToLocalInput(item.endsAt),
    speakerIds: [...(item.speakerIds || [])],
    adhoc: normalizeScheduleSpeakers(item).map((s) => ({
      name: s.name,
      role: s.role || "",
      company: s.company || "",
    })),
    isServiceSession: item.isServiceSession,
    isActive: item.isActive,
  };
}

const emptyAdhoc: AdhocSpeakerForm = { name: "", role: "", company: "" };

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
  const [form, setForm] = useState<FormState>(() => initialState(item, peers.length));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [spkName, setSpkName] = useState("");
  const [spkRole, setSpkRole] = useState("Speaker");
  const [spkCompany, setSpkCompany] = useState("");
  const [spkTalkTitle, setSpkTalkTitle] = useState("");
  const [spkPhotoUrl, setSpkPhotoUrl] = useState("");
  const [spkSaving, setSpkSaving] = useState(false);
  const [spkError, setSpkError] = useState<string | null>(null);
  const baseline = useRef<FormState>(initialState(item, peers.length));

  useEffect(() => {
    if (open) {
      const init = initialState(item, peers.length);
      setForm(init);
      baseline.current = init;
      setFormError(null);
      setShowAddSpeaker(false);
      setSpkError(null);
      setSpkTalkTitle(item?.title || "");
      onDirtyChange(false);
    }
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = open ? JSON.stringify(form) !== JSON.stringify(baseline.current) : false;
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

  function toggleSpeaker(id: string) {
    setForm((f) => ({
      ...f,
      speakerIds: f.speakerIds.includes(id)
        ? f.speakerIds.filter((s) => s !== id)
        : [...f.speakerIds, id],
    }));
  }

  const timeInvalid = Boolean(form.startsAt && form.endsAt && form.startsAt >= form.endsAt);
  const includedButUnscheduled = form.isActive && (!form.startsAt || !form.endsAt);
  const noRoom = !form.allRooms && form.roomIds.length === 0;

  const conflictTitles = useMemo(() => {
    if (!form.startsAt || !form.endsAt || timeInvalid) return [];
    const s = Date.parse(localInputToWibRfc3339(form.startsAt));
    const e = Date.parse(localInputToWibRfc3339(form.endsAt));
    if (Number.isNaN(s) || Number.isNaN(e)) return [];
    const cand = { roomIds: form.roomIds, allRooms: form.allRooms };
    return peers
      .filter((p) => p.id !== item?.id && p.startsAt && p.endsAt)
      .filter((p) => {
        const ps = Date.parse(p.startsAt!);
        const pe = Date.parse(p.endsAt!);
        if (Number.isNaN(ps) || Number.isNaN(pe)) return false;
        const overlap = s < pe && ps < e;
        return overlap && shareRoom(cand, p);
      })
      .map((p) => p.title);
  }, [form.startsAt, form.endsAt, form.roomIds, form.allRooms, peers, item, timeInvalid]);

  function requestClose(next: boolean) {
    if (!next) return;
    if (dirty && !submitting && !window.confirm("Discard unsaved changes to this session?")) return;
    onOpenChange(false);
  }

  async function handleAddSpeaker(e: React.FormEvent) {
    e.preventDefault();
    const talkTitle = spkTalkTitle.trim() || form.title.trim();
    if (!spkName.trim() || !spkRole.trim() || !talkTitle || !spkPhotoUrl.trim()) {
      setSpkError("Name, role, talk title, and photo URL are required by the speaker directory.");
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
        talkTitle,
      });
      onSpeakerCreated(created);
      setForm((f) => ({ ...f, speakerIds: [...f.speakerIds, created.id] }));
      setSpkName("");
      setSpkCompany("");
      setSpkPhotoUrl("");
      setShowAddSpeaker(false);
    } catch (err: any) {
      setSpkError(err?.message || "Failed to create speaker");
    } finally {
      setSpkSaving(false);
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
      startsAt: localInputToWibRfc3339(form.startsAt),
      endsAt: localInputToWibRfc3339(form.endsAt),
      isServiceSession: form.isServiceSession,
      isActive: form.isActive,
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

  const formatOptions = useMemo(
    () => [...formats].sort((a, b) => Number(a.archived) - Number(b.archived) || a.displayOrder - b.displayOrder),
    [formats],
  );
  const currentFormat = formatOptions.find((f) => f.id === form.formatId);

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Session" : "New Session"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update rooms, times, speakers, and publication inclusion. Conflicts save as drafts but block publishing."
              : "Incomplete sessions save as drafts. Nothing is published until you review and publish."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="sess-title">Title *</Label>
            <Input
              id="sess-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Architecting for the Future"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sess-format">Talk format</Label>
              <Select value={form.formatId || "none"} onValueChange={(v) => patch({ formatId: v === "none" ? "" : v })}>
                <SelectTrigger id="sess-format">
                  <SelectValue placeholder="No format" />
                </SelectTrigger>
                <SelectContent>
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
                <p className="text-[11px] text-muted-foreground">
                  This format is archived — pick an active one before publishing.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-service">Session kind</Label>
              <label id="sess-service" className="flex items-center gap-2 h-9 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.isServiceSession}
                  onChange={(e) => patch({ isServiceSession: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Service session (break, lunch, registration)
              </label>
            </div>
          </div>

          <fieldset className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-foreground">Rooms</legend>
            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.allRooms}
                onChange={(e) => patch({ allRooms: e.target.checked, roomIds: [] })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              All rooms (shared event / plenum)
            </label>
            {!form.allRooms && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {rooms.map((room) => (
                  <label key={room.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.roomIds.includes(room.id)}
                      onChange={() => toggleRoom(room.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {room.name}
                  </label>
                ))}
                {rooms.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active rooms — add rooms on the right first.</p>
                )}
              </div>
            )}
            {noRoom && (
              <p className="text-[11px] text-amber-400">No room assigned — saves as draft, excluded from publication.</p>
            )}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sess-start">Starts (WIB, UTC+7)</Label>
              <Input
                id="sess-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-end">Ends (WIB, UTC+7)</Label>
              <Input
                id="sess-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => patch({ endsAt: e.target.value })}
              />
            </div>
          </div>
          {timeInvalid && (
            <p role="alert" className="text-xs text-destructive">
              End time must be after start time.
            </p>
          )}
          {includedButUnscheduled && (
            <p className="text-xs text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              Included in publication but unscheduled — this blocks publishing until times are set.
            </p>
          )}
          {conflictTitles.length > 0 && (
            <p className="text-xs text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              Overlaps “{conflictTitles.join("”, “")}” in a shared room. Saves anyway, but review will flag it.
            </p>
          )}

          <fieldset className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-foreground">
              Speakers (directory)
            </legend>
            {speakers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No directory speakers for this event yet.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {speakers.map((spk) => (
                  <label
                    key={spk.id}
                    className="flex items-center gap-2.5 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.speakerIds.includes(spk.id)}
                      onChange={() => toggleSpeaker(spk.id)}
                      className="h-4 w-4 rounded border-input accent-primary shrink-0"
                    />
                    <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                      <AvatarImage src={spk.photoUrl || undefined} />
                      <AvatarFallback className="text-[10px] font-bold">{spk.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate">
                      <span className="font-semibold text-foreground mr-1.5">{spk.name}</span>
                      <span className="text-muted-foreground">
                        {spk.role}
                        {spk.company ? ` · ${spk.company}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {showAddSpeaker ? (
              <div className="space-y-2.5 p-3 rounded-lg border border-border/70 bg-background/40">
                <p className="text-[11px] text-muted-foreground">
                  Saved to the speaker directory <strong>immediately</strong> — it stays there even if you cancel
                  this session. Required: name, role, talk title, photo URL.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="spk-name" className="text-xs">Name *</Label>
                    <Input id="spk-name" value={spkName} onChange={(e) => setSpkName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Arief Nugraha" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="spk-role" className="text-xs">Role *</Label>
                    <Input id="spk-role" value={spkRole} onChange={(e) => setSpkRole(e.target.value)} className="h-8 text-xs" placeholder="e.g. Senior Solutions Architect" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="spk-company" className="text-xs">Company</Label>
                    <Input id="spk-company" value={spkCompany} onChange={(e) => setSpkCompany(e.target.value)} className="h-8 text-xs" placeholder="e.g. AWS" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="spk-talk" className="text-xs">Talk title *</Label>
                    <Input id="spk-talk" value={spkTalkTitle} onChange={(e) => setSpkTalkTitle(e.target.value)} className="h-8 text-xs" placeholder="Defaults to session title" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="spk-photo" className="text-xs">Photo URL *</Label>
                    <Input id="spk-photo" value={spkPhotoUrl} onChange={(e) => setSpkPhotoUrl(e.target.value)} className="h-8 text-xs" placeholder="https://…" />
                  </div>
                </div>
                {spkError && <p role="alert" className="text-xs text-destructive">{spkError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAddSpeaker} disabled={spkSaving} className="h-8 text-xs">
                    {spkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                    Save speaker &amp; select
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddSpeaker(false)} disabled={spkSaving} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddSpeaker(true)}
                className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add speaker to directory
              </Button>
            )}
          </fieldset>

          <fieldset className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-foreground">
              Ad-hoc speakers (not in directory)
            </legend>
            {form.adhoc.length === 0 && (
              <p className="text-xs text-muted-foreground">None — co-presenters from the directory cover most cases.</p>
            )}
            {form.adhoc.map((spk, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                  <div className="space-y-1">
                    <Label htmlFor={`adhoc-${idx}-name`} className="text-xs">Name</Label>
                    <Input
                      id={`adhoc-${idx}-name`}
                      value={spk.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          adhoc: f.adhoc.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)),
                        }))
                      }
                      className="h-8 text-xs"
                      placeholder="Speaker name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`adhoc-${idx}-role`} className="text-xs">Role</Label>
                    <Input
                      id={`adhoc-${idx}-role`}
                      value={spk.role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          adhoc: f.adhoc.map((s, i) => (i === idx ? { ...s, role: e.target.value } : s)),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`adhoc-${idx}-company`} className="text-xs">Company</Label>
                    <Input
                      id={`adhoc-${idx}-company`}
                      value={spk.company}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          adhoc: f.adhoc.map((s, i) => (i === idx ? { ...s, company: e.target.value } : s)),
                        }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ad-hoc speaker ${idx + 1}`}
                  onClick={() => setForm((f) => ({ ...f, adhoc: f.adhoc.filter((_, i) => i !== idx) }))}
                  className="h-8 w-8 p-0 mt-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, adhoc: [...f.adhoc, { ...emptyAdhoc }] }))}
              className="h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Add ad-hoc speaker
            </Button>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="sess-desc">Description</Label>
            <Textarea
              id="sess-desc"
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Session abstract shown on the public schedule…"
            />
          </div>

          <label className="flex items-start gap-2 text-xs font-medium text-foreground cursor-pointer p-3 rounded-xl border border-border/80 bg-muted/20">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
              className="h-4 w-4 mt-0.5 rounded border-input accent-primary"
            />
            <span>
              Include in next publication
              <span className="block text-[11px] font-normal text-muted-foreground">
                Excluded items stay as drafts and never appear on the public schedule.
              </span>
            </span>
          </label>

          {formError && (
            <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <DialogFooter className="pt-2">
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
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => requestClose(true)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.title.trim() || timeInvalid}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {item ? "Save Session" : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
