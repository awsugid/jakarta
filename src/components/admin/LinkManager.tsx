"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LinkEditor,
  type LinkFormValues,
  type PageFormValues,
} from "@/components/admin/LinkEditor";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  fetchAdminLinks,
  updateLinkPage,
  createLink,
  updateLink,
  deleteLink,
  reorderLinks,
} from "@/lib/api";
import type {
  LinkItem,
  LinkPageProfile,
} from "@/lib/types";

function sortByOrder(arr: LinkItem[]): LinkItem[] {
  return [...arr].sort((a, b) => a.displayOrder - b.displayOrder);
}

// ---------------------------------------------------------------------------
// LinkManager
// ---------------------------------------------------------------------------
export function LinkManager() {
  const [profile, setProfile] = useState<LinkPageProfile | null>(null);
  const [items, setItems] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [pageDirty, setPageDirty] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminLinks();
      setProfile(data.page);
      setItems(sortByOrder(data.items ?? []));
      setPageDirty(false);
      setRowErrors({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function markRowError(id: string, msg: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });
  }

  async function saveProfile(values: PageFormValues) {
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await updateLinkPage({
        title: values.title,
        bio: values.bio || null,
        avatarUrl: values.avatarUrl || null,
        background: values.background,
        buttonStyle: values.buttonStyle,
      });
      setProfile(updated);
      setPageDirty(false);
    } catch (e: unknown) {
      // Keep form values; LinkEditor retains its own state.
      setProfileError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingProfile(false);
    }
  }

  function openAdd() {
    setEditingItem(null);
    setItemError(null);
    setEditorOpen(true);
  }

  function openEdit(item: LinkItem) {
    setEditingItem(item);
    setItemError(null);
    setEditorOpen(true);
  }

  async function saveItem(values: LinkFormValues, id?: string) {
    setSavingItem(true);
    setItemError(null);
    try {
      if (id) {
        const updated = await updateLink(id, {
          label: values.label,
          url: values.url,
          icon: values.icon,
          isEnabled: values.isEnabled,
        });
        setItems((prev) => sortByOrder(prev.map((i) => (i.id === id ? updated : i))));
      } else {
        const created = await createLink({
          label: values.label,
          url: values.url,
          icon: values.icon,
        });
        setItems((prev) => sortByOrder([...prev, created]));
      }
      setEditorOpen(false);
      setEditingItem(null);
    } catch (e: unknown) {
      setItemError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingItem(false);
    }
  }

  async function toggleEnabled(item: LinkItem, next: boolean) {
    if (savingId) return;
    markRowError(item.id, null);
    setSavingId(item.id);
    try {
      const updated = await updateLink(item.id, {
        label: item.label,
        url: item.url,
        icon: item.icon,
        isEnabled: next,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (e: unknown) {
      markRowError(item.id, e instanceof Error ? e.message : "Toggle failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function reorder(index: number, dir: -1 | 1) {
    if (savingId) return;
    const sorted = sortByOrder(items);
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const target = [...sorted];
    [target[index], target[j]] = [target[j], target[index]];
    const ids = target.map((i) => i.id);
    const moved = sorted[index];
    markRowError(moved.id, null);
    setSavingId(moved.id);
    try {
      const refreshed = await reorderLinks(ids);
      setItems(sortByOrder(refreshed.items));
    } catch (e: unknown) {
      markRowError(moved.id, e instanceof Error ? e.message : "Reorder failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteLink(target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  // ---- render ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card border border-border/80 rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading links…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={load} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const sortedItems = sortByOrder(items);

  return (
    <div className="space-y-6">
      {/* Profile settings */}
      <Card className="bg-card border-border/80" data-dirty={pageDirty ? "true" : "false"}>
        <CardHeader>
          <CardTitle className="text-lg">Page settings</CardTitle>
          <CardDescription>
            Title, bio, avatar, and visual style for the public /links page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <LinkEditor
              variant="page"
              initial={{
                title: profile.title,
                bio: profile.bio ?? "",
                avatarUrl: profile.avatarUrl ?? "",
                background: profile.background,
                buttonStyle: profile.buttonStyle,
              }}
              onSave={(v) => {
                setPageDirty(true);
                return saveProfile(v);
              }}
              saving={savingProfile}
              serverError={profileError}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No profile loaded.</p>
          )}
        </CardContent>
      </Card>

      {/* Links list */}
      <Card className="bg-card border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Links</CardTitle>
            <CardDescription>
              Add, edit, reorder, enable, or delete links on the public page.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={openAdd}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No links yet. Click “Add link” to create the first one.
            </p>
          ) : (
            sortedItems.map((item, idx) => (
              <LinkRow
                key={item.id}
                item={item}
                index={idx}
                total={sortedItems.length}
                busy={savingId === item.id}
                error={rowErrors[item.id]}
                onToggle={(v) => toggleEnabled(item, v)}
                onEdit={() => openEdit(item)}
                onDelete={() => setDeleteTarget(item)}
                onUp={() => reorder(idx, -1)}
                onDown={() => reorder(idx, 1)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog
        open={editorOpen}
        onOpenChange={(v) => {
          if (!savingItem) {
            setEditorOpen(v);
            if (!v) {
              setEditingItem(null);
              setItemError(null);
            }
          }
        }}
      >
        <DialogContent className="bg-card border-border/80 text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit link" : "Add link"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the label, URL, icon, or enabled state."
                : "Create a new link on the public /links page."}
            </DialogDescription>
          </DialogHeader>
          <LinkEditor
            variant="link"
            initial={
              editingItem
                ? {
                    id: editingItem.id,
                    label: editingItem.label,
                    url: editingItem.url,
                    icon: editingItem.icon ?? "link",
                    isEnabled: editingItem.isEnabled,
                  }
                : undefined
            }
            onSave={saveItem}
            onCancel={() => {
              setEditorOpen(false);
              setEditingItem(null);
              setItemError(null);
            }}
            saving={savingItem}
            serverError={itemError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!deleting) {
            setDeleteTarget(v ? deleteTarget : null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="bg-card border-border/80 text-foreground">
          <DialogHeader>
            <DialogTitle>Delete link?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.label}” will be removed from the public page. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link row
// ---------------------------------------------------------------------------
function LinkRow({
  item,
  index,
  total,
  busy,
  error,
  onToggle,
  onEdit,
  onDelete,
  onUp,
  onDown,
}: {
  item: LinkItem;
  index: number;
  total: number;
  busy: boolean;
  error?: string;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col gap-1 pt-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onUp}
            disabled={index === 0 || busy}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onDown}
            disabled={index === total - 1 || busy}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Label / url / icon */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">
            {item.label}
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-primary hover:underline truncate"
          >
            {item.url}
          </a>
          <div className="text-xs text-muted-foreground capitalize">
            icon: {item.icon ?? "—"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ponytail: shadcn/ui switch primitive absent in this repo and
              dependency additions are out of scope (Wave 1). Using the
              existing Checkbox primitive as the toggle. Swap for Switch in
              Wave 3 if/when @/components/ui/switch is added. */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={item.isEnabled}
              onCheckedChange={(v) => onToggle(v === true)}
              disabled={busy}
              aria-label={`Toggle enabled for ${item.label}`}
            />
            <span>{item.isEnabled ? "Enabled" : "Disabled"}</span>
          </label>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {busy && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Working…
        </div>
      )}
      {error && (
        <p className="text-xs text-destructive mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
