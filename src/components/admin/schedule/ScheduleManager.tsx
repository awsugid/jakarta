"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
import { KNOWN_SCHEDULE_EVENTS, activeRooms, buildConflictMap, isScheduled, createRefreshGate } from "./schedule-helpers";

export function ScheduleManager() {
  const [eventSlug, setEventSlug] = useState(COMMUNITY_DAY_EVENT_SLUG);
  return <ScheduleWorkspace key={eventSlug} eventSlug={eventSlug} onEventChange={setEventSlug} />;
}

function ScheduleWorkspace({ eventSlug, onEventChange }: { eventSlug: string; onEventChange: (slug: string) => void }) {
  const [view, setView] = useState("agenda");
  const [refreshing, setRefreshing] = useState(false);
  const refreshGate = useRef(createRefreshGate());
  const mutationLock = useRef(false);
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

  const loadAll = useCallback(async () => refreshGate.current.run(async (isCurrent) => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const [sched, roomsRes, formatsRes, spk] = await Promise.all([
        fetchAdminSchedule(eventSlug),
        fetchScheduleRooms(eventSlug),
        fetchScheduleFormats(eventSlug),
        fetchAdminSpeakers(eventSlug),
      ]);
      if (!isCurrent()) return;
      setSchedule(sched.schedule || []);
      setRevision(sched.revision ?? 0);
      setPublishedAt(sched.publishedAt ?? null);
      setRooms(roomsRes.rooms || []);
      setFormats(formatsRes.formats || []);
      setSpeakers(spk.speakers || []);
    } catch (err: any) {
      if (isCurrent()) setLoadError(err?.message || "Failed to refresh schedule. Your edits are still here; retry before making more changes.");
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }), [eventSlug]);

  useEffect(() => {
    void loadAll();
    return () => refreshGate.current.invalidate();
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
    if (mutationLock.current || refreshing || loadError) return;
    mutationLock.current = true;
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
      // Keep controls locked until authoritative revisions arrive.
      await loadAll();
      setBusyId(null);
      mutationLock.current = false;
    }
  }

  async function handleDelete(item: EventScheduleItem) {
    if (mutationLock.current || refreshing || loadError) return;
    if (!window.confirm(`Delete “${item.title}” from the schedule?`)) return;
    mutationLock.current = true;
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
      await loadAll();
      setBusyId(null);
      mutationLock.current = false;
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
    <div className="min-w-0 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Schedule Workspace
          </h2>

          <p className="text-xs text-muted-foreground">
            {publishedLabel} · draft r{revision}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Select value={eventSlug} disabled={refreshing || !!busyId || publishing || reviewLoading || editorOpen || explorerOpen} onValueChange={(slug) => {
                      if (anyDirty && !window.confirm("Discard unsaved changes and switch events?")) return;
                      onEventChange(slug);
                    }}>
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
          <Button type="button" variant="outline" size="sm" onClick={() => setExplorerOpen(true)} disabled={loading || !!loadError} className="h-10 px-3.5 border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold">
            <Sparkles className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Sessionize
          </Button>
          <Button type="button" size="sm" onClick={openCreate} disabled={loading || !!loadError} className="h-10 px-4 text-xs font-semibold shadow-md">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New Session
          </Button>
          <Button type="button" size="sm" onClick={openReview} disabled={loading || refreshing || !!busyId || anyDirty || !!loadError} className="h-10 px-4 text-xs font-semibold shadow-md">
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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-live="polite">
        {[
          { label: "Sessions", value: schedule.length, cls: "text-foreground" },
          { label: "Included in publish", value: includedCount, cls: "text-emerald-400" },
          { label: "Unscheduled", value: unscheduledCount, cls: "text-amber-400" },
          { label: "Conflicts", value: conflicts.size, cls: conflicts.size ? "text-destructive" : "text-foreground" },
        ].map((stat) => (
          <span key={stat.label}><strong className={`font-semibold tabular-nums ${stat.cls}`}>{stat.value}</strong> {stat.label.toLowerCase()}</span>
        ))}
      </div>

      <nav aria-label="Schedule views" className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        {[["agenda", "Agenda"], ["rooms", "Rooms"], ["formats", "Talk formats"]].map(([id, label]) => (
          <Button key={id} size="sm" variant={view === id ? "secondary" : "ghost"} aria-pressed={view === id} onClick={() => setView(id)}>{label}{(id === "rooms" && roomsDirty) || (id === "formats" && formatsDirty) ? " •" : ""}</Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" disabled={refreshing} onClick={() => void loadAll()}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </nav>
      {loadError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{loadError}</p>}
      {/* Body */}
      {loading ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading schedule workspace…</p>
        </div>
      ) : (
        <div className="min-w-0">
          <div hidden={view !== "agenda"}>
          <ScheduleTimeline
            items={schedule}
            rooms={rooms}
            formats={formats}
            busyId={busyId}
            mutationsBlocked={refreshing || !!busyId || !!loadError}
            onEdit={openEdit}
            onToggleInclude={handleToggleInclude}
          />
          </div>
          <div hidden={view !== "rooms"} className="max-w-3xl">
            <RoomsDirectory
              eventSlug={eventSlug}
              rooms={rooms}
              onChanged={loadAll}
              onDirtyChange={setRoomsDirty}
              refreshFailed={!!loadError}
            />
          </div>
          <div hidden={view !== "formats"} className="max-w-3xl">
            <FormatsDirectory
              eventSlug={eventSlug}
              formats={formats}
              onChanged={loadAll}
              onDirtyChange={setFormatsDirty}
              refreshFailed={!!loadError}
            />
          </div>
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
