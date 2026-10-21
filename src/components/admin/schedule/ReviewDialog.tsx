"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, EyeOff, Loader2, Minus, Plus, RefreshCw, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ScheduleReview } from "@/lib/types";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ScheduleReview | null;
  loading: boolean;
  error: string | null;
  currentRevision: number;
  publishing: boolean;
  publishError: string | null;
  onPublish: () => void;
  onReload: () => void;
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
  loading,
  error,
  currentRevision,
  publishing,
  publishError,
  onPublish,
  onReload,
}: ReviewDialogProps) {
  const stale = review !== null && review.revision !== currentRevision;
  const blocked = review !== null && (!review.canPublish || stale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review &amp; Publish</DialogTitle>
          <DialogDescription>
            Changes publish together. Conflicts and incomplete items block publication until fixed.
          </DialogDescription>
        </DialogHeader>

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
          <div className="space-y-5 pt-1">
            {stale && (
              <p className="text-xs text-amber-400 flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                The schedule changed elsewhere since this review (draft r{review.revision} vs loaded r{currentRevision}).
                Reload and review again to publish.
              </p>
            )}

            {review.conflicts.length > 0 ? (
              <section aria-label="Conflicts" className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Conflicts ({review.conflicts.length}) — publishing blocked
                </h4>
                <ul className="space-y-1.5">
                  {review.conflicts.map((c, i) => (
                    <li key={i} className="text-[11px] text-foreground/90 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      {c.detail}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                No conflicts — {review.includedCount} item{review.includedCount === 1 ? "" : "s"} ready to publish.
              </p>
            )}

            {review.excluded.length > 0 && (
              <section aria-label="Excluded items" className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Excluded drafts ({review.excluded.length})
                </h4>
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
              </section>
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

            {publishError && (
              <p role="alert" className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                {publishError}
              </p>
            )}

            <DialogFooter className="pt-1">
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
