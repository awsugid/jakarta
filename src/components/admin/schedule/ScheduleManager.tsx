"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteAdminScheduleItem,
  fetchAdminSchedule,
  fetchAdminSpeakers,
  fetchScheduleFormats,
  fetchScheduleRooms,
  publishSchedule,
  reviewSchedule,
  updateAdminScheduleItem,
} from "@/lib/api";
import type {
  EventScheduleItem,
  EventSpeaker,
  ScheduleFormat,
  ScheduleReview,
  ScheduleRoom,
} from "@/lib/types";
import { COMMUNITY_DAY_EVENT_SLUG } from "@/components/sponsor/communityDayConfig";
import { RoomsDirectory } from "./RoomsDirectory";
import { FormatsDirectory } from "./FormatsDirectory";
import { SessionEditorDialog, type ItemWithSpeakerRefs } from "./SessionEditorDialog";
import { ScheduleTimeline } from "./ScheduleTimeline";
import { ReviewDialog } from "./ReviewDialog";
import { SessionizeExplorer } from "./SessionizeExplorer";
import { KNOWN_SCHEDULE_EVENTS, activeRooms, buildConflictMap, isScheduled } from "./schedule-helpers";

export function ScheduleManager() {
  const [eventSlug, setEventSlug] = useState(COMMUNITY_DAY_EVENT_SLUG);
  const [schedule, setSchedule] = useState<EventScheduleItem[]>([]);
  const [revision, setRevision] = useState(0);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ScheduleRoom[]>([]);
  const [formats, setFormats] = useState<ScheduleFormat[]>([]);
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishNote, setPublishNote] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithSpeakerRefs | null>(null);
  const [explorerOpen, setExplorerOpen] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState<ScheduleReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [editorDirty, setEditorDirty] = useState(false);
  const [roomsDirty, setRoomsDirty] = useState(false);
  const [formatsDirty, setFormatsDirty] = useState(false);
  const anyDirty = editorDirty || roomsDirty || formatsDirty;

  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sched, roomsRes, formatsRes, spk] = await Promise.all([
        fetchAdminSchedule(eventSlug),
        fetchScheduleRooms(eventSlug),
        fetchScheduleFormats(eventSlug),
        fetchAdminSpeakers(eventSlug),
      ]);
      setSchedule(sched.schedule || []);
      setRevision(sched.revision ?? 0);
      setPublishedAt(sched.publishedAt ?? null);
      setRooms(roomsRes.rooms || []);
      setFormats(formatsRes.formats || []);
      setSpeakers(spk.speakers || []);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load schedule workspace");
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const conflicts = useMemo(() => buildConflictMap(schedule), [schedule]);
  const unscheduledCount = useMemo(
    () => schedule.filter((it) => !isScheduled(it)).length,
    [schedule],
  );
  const includedCount = useMemo(() => schedule.filter((it) => it.isActive).length, [schedule]);
  const existingSessionIds = useMemo(
    () => new Set(schedule.map((it) => it.sessionId).filter(Boolean) as string[]),
    [schedule],
  );

  function openCreate() {
    setEditingItem(null);
    setEditorOpen(true);
  }

  function openEdit(item: EventScheduleItem) {
    setEditingItem(item as ItemWithSpeakerRefs);
    setEditorOpen(true);
  }

  async function handleToggleInclude(item: EventScheduleItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await updateAdminScheduleItem(eventSlug, item.id, {
        revision: item.revision,
        isActive: !item.isActive,
      });
    } catch (err: any) {
      setActionError(
        err?.message ||
          `Failed to update “${item.title}” — it may have changed. Reload and retry.`,
      );
    } finally {
      setBusyId(null);
      // Revisions are authoritative server-side; never guess locally.
      await loadAll();
    }
  }

  async function handleDelete(item: EventScheduleItem) {
    if (!window.confirm(`Delete “${item.title}” from the schedule?`)) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      await deleteAdminScheduleItem(eventSlug, item.id, item.revision);
    } catch (err: any) {
      setActionError(
        err?.message ||
          `Failed to delete “${item.title}” — it may have changed. Reload and retry.`,
      );
    } finally {
      setBusyId(null);
      await loadAll();
    }
  }

  async function openReview() {
    setReviewOpen(true);
    setReview(null); // avoid flashing a stale review against a fresh revision
    setReviewError(null);
    setPublishError(null);
    setReviewLoading(true);
    try {
      setReview(await reviewSchedule(eventSlug));
    } catch (err: any) {
      setReviewError(err?.message || "Failed to review schedule");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handlePublish() {
    if (!review) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const pub = await publishSchedule(eventSlug, review.revision);
      setPublishNote(`Published ${pub.itemCount} items at ${new Date(pub.publishedAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`);
      setReviewOpen(false);
      setReview(null);
      await loadAll();
    } catch (err: any) {
      setPublishError(err?.message || "Publish failed — the draft may be stale. Reload and re-review.");
    } finally {
      setPublishing(false);
    }
  }

  const liveRooms = activeRooms(rooms);
  const publishedLabel = publishedAt
    ? `Last published ${new Date(publishedAt).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} WIB`
    : "Not published yet";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-card via-background to-muted/30 border border-border/80 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Schedule Workspace
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Rooms, formats, sessions, and publication in one place. Drafts save anytime; publishing
            requires a clean review.
          </p>
          <p className="text-xs text-muted-foreground">
            {publishedLabel} · draft r{revision}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Select value={eventSlug} onValueChange={setEventSlug}>
            <SelectTrigger className="w-[260px] bg-card border-border h-10 text-xs font-medium" aria-label="Select event">
              <CalendarClock className="h-4 w-4 mr-2 text-primary" aria-hidden="true" />
              <SelectValue placeholder="Select Event" />
            </SelectTrigger>
            <SelectContent>
              {KNOWN_SCHEDULE_EVENTS.map((evt) => (
                <SelectItem key={evt.slug} value={evt.slug}>{evt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => setExplorerOpen(true)} className="h-10 px-3.5 border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold">
            <Sparkles className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Sessionize
          </Button>
          <Button type="button" size="sm" onClick={openCreate} className="h-10 px-4 text-xs font-semibold shadow-md">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New Session
          </Button>
          <Button type="button" size="sm" onClick={openReview} disabled={loading} className="h-10 px-4 text-xs font-semibold shadow-md">
            <Rocket className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Review &amp; Publish
          </Button>
        </div>
      </div>

      {publishNote && (
        <p role="status" className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
          {publishNote}
          <button type="button" onClick={() => setPublishNote(null)} className="text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Dismiss publication note">
            Dismiss
          </button>
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
          {actionError}
          <Button type="button" size="sm" variant="outline" onClick={loadAll} className="h-7 text-[11px] shrink-0">
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
            Reload
          </Button>
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Sessions", value: schedule.length, cls: "text-foreground" },
          { label: "Included in publish", value: includedCount, cls: "text-emerald-400" },
          { label: "Unscheduled", value: unscheduledCount, cls: "text-amber-400" },
          { label: "Conflicts", value: conflicts.size, cls: conflicts.size ? "text-destructive" : "text-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 bg-card/60 border-border/80">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${stat.cls}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading schedule workspace…</p>
        </div>
      ) : loadError ? (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-3">
          <p className="text-sm font-semibold">{loadError}</p>
          <Button size="sm" variant="outline" onClick={loadAll}>Try Again</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <ScheduleTimeline
            items={schedule}
            rooms={rooms}
            formats={formats}
            busyId={busyId}
            onEdit={openEdit}
            onToggleInclude={handleToggleInclude}
          />
          <aside className="space-y-4 lg:sticky lg:top-4">
            <RoomsDirectory
              eventSlug={eventSlug}
              rooms={rooms}
              onChanged={loadAll}
              onDirtyChange={setRoomsDirty}
            />
            <FormatsDirectory
              eventSlug={eventSlug}
              formats={formats}
              onChanged={loadAll}
              onDirtyChange={setFormatsDirty}
            />
          </aside>
        </div>
      )}

      <SessionEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        eventSlug={eventSlug}
        item={editingItem}
        rooms={liveRooms}
        formats={formats}
        speakers={speakers}
        peers={schedule}
        onSaved={loadAll}
        onDelete={handleDelete}
        onSpeakerCreated={(spk) => setSpeakers((prev) => [spk, ...prev])}
        onDirtyChange={setEditorDirty}
      />

      <SessionizeExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        eventSlug={eventSlug}
        existingSessionIds={existingSessionIds}
        onImported={loadAll}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        review={review}
        loading={reviewLoading}
        error={reviewError}
        currentRevision={revision}
        publishing={publishing}
        publishError={publishError}
        onPublish={handlePublish}
        onReload={async () => {
          setReview(null);
          await loadAll();
          setReviewError(null);
          setPublishError(null);
          setReviewLoading(true);
          try {
            setReview(await reviewSchedule(eventSlug));
          } catch (err: any) {
            setReviewError(err?.message || "Failed to review schedule");
          } finally {
            setReviewLoading(false);
          }
        }}
      />
    </div>
  );
}
