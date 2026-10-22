"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, EyeOff, Loader2, Minus, Pencil, Plus, RefreshCw, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventScheduleItem, ScheduleReview } from "@/lib/types";
import { presentConflict, sessionTitle } from "./review-conflicts";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ScheduleReview | null;
  items: EventScheduleItem[];
  loading: boolean;
  error: string | null;
  currentRevision: number;
  publishing: boolean;
  publishError: string | null;
  onPublish: () => void;
  onReload: () => void;
  onEditSession: (itemId: string) => void;
}

function EntryList({
  icon,
  tone,
  entries,
  emptyText,
}: {
  icon: React.ReactNode;
  tone: string;
  entries: { id: string; title: string }[];
  emptyText: string;
}) {
  if (entries.length === 0) return <p className="text-[11px] text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <li key={entry.id} className={`flex items-start gap-1.5 text-[11px] ${tone}`}>
          <span className="shrink-0 mt-0.5">{icon}</span>
          <span className="text-foreground/90 truncate" title={entry.title}>{entry.title}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  review,
  items,
  loading,
  error,
  currentRevision,
  publishing,
  publishError,
  onPublish,
  onReload,
  onEditSession,
}: ReviewDialogProps) {
  const stale = review !== null && review.revision !== currentRevision;
  const blocked = review !== null && (!review.canPublish || stale);
  const issues = review?.conflicts ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border pb-4 text-left">
          <DialogTitle>Review &amp; Publish</DialogTitle>
          <DialogDescription>
            {issues.length > 0
              ? "Changes publish together as one update. Resolve every issue below before publishing."
              : "Changes publish together as one update."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-4">
          {loading ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Reviewing schedule…</p>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {error}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={onReload}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Reload schedule
              </Button>
            </div>
          ) : review ? (
            <div className="space-y-5">
              {stale && (
                <p className="text-xs text-amber-400 flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  The schedule changed elsewhere since this review (draft r{review.revision} vs loaded r{currentRevision}).
                  Reload and review again to publish.
                </p>
              )}

              {issues.length > 0 ? (
                <section aria-label="Issues to resolve" className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {issues.length} issue{issues.length === 1 ? "" : "s"} to resolve
                  </h4>
                  <ul className="space-y-2">
                    {issues.map((c, i) => {
                      const { heading, why } = presentConflict(c);
                      const title = sessionTitle(items, c.itemId);
                      const item = c.itemId ? items.find((it) => it.id === c.itemId) : undefined;
                      return (
                        <li key={c.itemId ?? `event-${i}`} className="min-w-0 space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                          {title !== null && (
                            <p className="truncate text-[11px] font-semibold text-foreground" title={title}>
                              {title}
                            </p>
                          )}
                          <p className="text-xs font-bold text-foreground">{heading}</p>
                          <p className="text-[11px] leading-relaxed text-foreground/80">{why}</p>
                          <p className="break-words text-[10px] leading-relaxed text-foreground/60">{c.detail}</p>
                          {item ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[11px]"
                              onClick={() => onEditSession(item.id)}
                            >
                              <Pencil className="h-3 w-3 mr-1" aria-hidden="true" />
                              Edit session
                            </Button>
                          ) : c.itemId ? (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <p className="text-[11px] text-amber-400">This session is no longer in your draft.</p>
                              <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-[11px]" onClick={onReload}>
                                <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                                Reload
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  No conflicts — {review.includedCount} item{review.includedCount === 1 ? "" : "s"} ready to publish.
                </p>
              )}

              {review.excluded.length > 0 && (
                <details className="group rounded-lg border border-border/60">
                  <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                    {review.excluded.length} draft{review.excluded.length === 1 ? "" : "s"} excluded from this publication
                  </summary>
                  <div className="space-y-2 px-3 pb-3">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Excluded drafts stay private — publishing only sends sessions marked as included. This is expected, not an error.
                    </p>
                    <ul className="space-y-1.5">
                      {review.excluded.map((x) => (
                        <li key={x.id} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <EyeOff className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>
                            <span className="text-foreground/80 font-medium">{x.title}</span> — {x.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <section aria-label="Added items" className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Added ({review.added.length})</h4>
                  <EntryList icon={<Plus className="h-3 w-3" />} tone="text-emerald-400" entries={review.added} emptyText="Nothing new." />
                </section>
                <section aria-label="Updated items" className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Updated ({review.updated.length})</h4>
                  <EntryList icon={<ArrowRight className="h-3 w-3" />} tone="text-primary" entries={review.updated} emptyText="No changes." />
                </section>
                <section aria-label="Removed items" className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-destructive">Removed ({review.removed.length})</h4>
                  <EntryList icon={<Minus className="h-3 w-3" />} tone="text-destructive" entries={review.removed} emptyText="Nothing removed." />
                </section>
              </div>
            </div>
          ) : null}
        </div>

        {review && !loading && !error ? (
          <div className="shrink-0 space-y-2 border-t border-border pt-4">
            {publishError && (
              <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {publishError}
              </p>
            )}
            <DialogFooter>
              {stale ? (
                <Button type="button" onClick={onReload} className="text-xs">
                  <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Reload &amp; re-review
                </Button>
              ) : (
                <Button type="button" onClick={onPublish} disabled={blocked || publishing} className="text-xs">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Rocket className="h-4 w-4 mr-1.5" aria-hidden="true" />}
                  Publish {review.includedCount} item{review.includedCount === 1 ? "" : "s"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
