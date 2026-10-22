"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Check, DoorOpen, Loader2, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createScheduleRoom, updateScheduleRoom } from "@/lib/api";
import type { ScheduleRoom } from "@/lib/types";
import { nextDisplayOrder, orderedRooms, planDirectoryMove } from "./schedule-helpers";

interface RoomsDirectoryProps {
  eventSlug: string;
  rooms: ScheduleRoom[];
  onChanged: () => void | Promise<void>;
  refreshFailed?: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

export function RoomsDirectory({ eventSlug, rooms, onChanged, onDirtyChange, refreshFailed }:  RoomsDirectoryProps) {
  const [newName, setNewName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const lock = useRef(false);
  const busy = pending !== null || refreshFailed;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = orderedRooms(rooms);

  useEffect(() => {
    onDirtyChange(!!newName.trim() || editingId !== null || pending !== null);
  }, [newName, editingId, pending, onDirtyChange]);

  async function run(fn: () => Promise<unknown>, control: string, onSuccess?: () => void) {
    if (lock.current || refreshFailed) return;
    lock.current = true;
    setPending(control);
    setError(null);
    try {
      await fn();
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Operation failed — the room may have changed. Reload and retry.");
    } finally {
      // Reorder is several non-atomic PUTs — always resync from the server so
      // stale revisions never linger, even after a failure.
      try {
        await onChanged();
      } finally {
        setPending(null);
        lock.current = false;
      }
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(() => createScheduleRoom(eventSlug, { name, displayOrder: nextDisplayOrder(rooms) }), "add", () => setNewName(""));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  function rename(room: ScheduleRoom) {
    const name = editName.trim();
    if (!name || name === room.name) {
      cancelEdit();
      return;
    }
    void run(() => updateScheduleRoom(eventSlug, room.id, { name, revision: room.revision }), room.id, cancelEdit);
  }

  function move(room: ScheduleRoom, dir: -1 | 1) {
    const updates = planDirectoryMove(rooms, room.id, dir);
    if (updates.length === 0) return;
    run(() =>
      Promise.allSettled(
        updates.map((u) =>
          updateScheduleRoom(eventSlug, u.id, { displayOrder: u.displayOrder, revision: u.revision }),
        ),
      ).then((results) => {
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      }), room.id,
    );
  }

  return (
    <section aria-label="Rooms directory" className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          Rooms
        </h3>
        <span className="text-xs text-muted-foreground">
          {list.filter((r) => !r.archived).length} active · {list.filter((r) => r.archived).length} archived
        </span>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-room" className="sr-only">
          New room name
        </label>
        <Input
          id="new-room"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Main Stage"
          className="h-9 text-xs bg-background"
          disabled={busy}
        />
        <Button type="submit" size="sm" disabled={busy || !newName.trim()} className="h-9 text-xs shrink-0">
          {pending === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No rooms yet — add rooms first, then assign sessions to them in the timeline.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {list.map((room, idx) => {
            const isEditing = editingId === room.id;
            return (
              <li key={room.id} className={`py-2.5 flex items-center gap-2 ${room.archived ? "opacity-55" : ""}`}>
                {isEditing ? (
                  <>
                    <label htmlFor={`room-${room.id}`} className="sr-only">
                      Rename {room.name}
                    </label>
                    <Input
                      id={`room-${room.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                                            disabled={pending === room.id}
                      autoFocus
                      className="h-8 text-xs bg-background"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(room);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={busy || !editName.trim()} aria-label={`Save name for ${room.name}`} onClick={() => rename(room)}>
                      {pending === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-400" />}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pending === room.id} aria-label="Cancel rename" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{room.name}</span>
                    {room.archived && <Badge variant="outline" className="text-[10px] text-muted-foreground">Archived</Badge>}
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={busy || editingId !== null} aria-label={`Rename ${room.name}`} onClick={() => { setEditingId(room.id); setEditName(room.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!room.archived && (
                        <>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Move ${room.name} up`} disabled={busy || idx === 0} onClick={() => move(room, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Move ${room.name} down`} disabled={busy || idx === list.filter((r) => !r.archived).length - 1} onClick={() => move(room, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Archive ${room.name}`} disabled={busy} onClick={() => run(() => updateScheduleRoom(eventSlug, room.id, { archived: true, revision: room.revision }), room.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {room.archived && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Restore ${room.name}`} disabled={busy} onClick={() => run(() => updateScheduleRoom(eventSlug, room.id, { archived: false, revision: room.revision }), room.id)}>
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
