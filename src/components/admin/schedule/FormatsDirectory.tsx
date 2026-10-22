"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Check, Loader2, MessageSquareText, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createScheduleFormat, updateScheduleFormat } from "@/lib/api";
import type { ScheduleFormat } from "@/lib/types";
import { nextDisplayOrder, planDirectoryMove } from "./schedule-helpers";

interface FormatsDirectoryProps {
  eventSlug: string;
  formats: ScheduleFormat[];
  onChanged: () => void | Promise<void>;
  refreshFailed?: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

export function FormatsDirectory({ eventSlug, formats, onChanged, onDirtyChange, refreshFailed }: FormatsDirectoryProps) {
  const [newName, setNewName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const lock = useRef(false);
  const busy = pending !== null || refreshFailed;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = [...formats].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.displayOrder - b.displayOrder,
  );

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
      setError(err?.message || "Operation failed — the format may have changed. Reload and retry.");
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
    void run(() => createScheduleFormat(eventSlug, { name, displayOrder: nextDisplayOrder(formats) }), "add", () => setNewName(""));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  function rename(fmt: ScheduleFormat) {
    const name = editName.trim();
    if (!name || name === fmt.name) {
      cancelEdit();
      return;
    }
    void run(() => updateScheduleFormat(eventSlug, fmt.id, { name, revision: fmt.revision }), fmt.id, cancelEdit);
  }

  function move(fmt: ScheduleFormat, dir: -1 | 1) {
    const updates = planDirectoryMove(formats, fmt.id, dir);
    if (updates.length === 0) return;
    run(() =>
      Promise.allSettled(
        updates.map((u) =>
          updateScheduleFormat(eventSlug, u.id, { displayOrder: u.displayOrder, revision: u.revision }),
        ),
      ).then((results) => {
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      }), fmt.id,
    );
  }

  return (
    <section aria-label="Talk formats directory" className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
          Talk Formats
        </h3>
        <span className="text-xs text-muted-foreground">
          {list.filter((f) => !f.archived).length} active · {list.filter((f) => f.archived).length} archived
        </span>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-format" className="sr-only">
          New talk format name
        </label>
        <Input
          id="new-format"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Lightning Talk"
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
          No formats yet — add talk formats (Talk, Workshop, Panel…) so sessions can be categorized.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {list.map((fmt, idx) => {
            const isEditing = editingId === fmt.id;
            return (
              <li key={fmt.id} className={`py-2.5 flex items-center gap-2 ${fmt.archived ? "opacity-55" : ""}`}>
                {isEditing ? (
                  <>
                    <label htmlFor={`fmt-${fmt.id}`} className="sr-only">
                      Rename {fmt.name}
                    </label>
                    <Input
                      id={`fmt-${fmt.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                                            disabled={pending === fmt.id}
                      autoFocus
                      className="h-8 text-xs bg-background"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(fmt);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={busy || !editName.trim()} aria-label={`Save name for ${fmt.name}`} onClick={() => rename(fmt)}>
                      {pending === fmt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-400" />}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pending === fmt.id} aria-label="Cancel rename" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{fmt.name}</span>
                    {fmt.archived && <Badge variant="outline" className="text-[10px] text-muted-foreground">Archived</Badge>}
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={busy || editingId !== null} aria-label={`Rename ${fmt.name}`} onClick={() => { setEditingId(fmt.id); setEditName(fmt.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!fmt.archived && (
                        <>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Move ${fmt.name} up`} disabled={busy || idx === 0} onClick={() => move(fmt, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Move ${fmt.name} down`} disabled={busy || idx === list.filter((f) => !f.archived).length - 1} onClick={() => move(fmt, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Archive ${fmt.name}`} disabled={busy} onClick={() => run(() => updateScheduleFormat(eventSlug, fmt.id, { archived: true, revision: fmt.revision }), fmt.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {fmt.archived && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Restore ${fmt.name}`} disabled={busy} onClick={() => run(() => updateScheduleFormat(eventSlug, fmt.id, { archived: false, revision: fmt.revision }), fmt.id)}>
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
