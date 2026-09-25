"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminNavigation, type AdminTab } from "@/components/admin/AdminNavigation";
import { FormSelector } from "@/components/admin/FormSelector";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { FormbricksResponsesTable } from "@/components/admin/FormbricksResponsesTable";
import { ResponseDetailDrawer } from "@/components/admin/ResponseDetailDrawer";
import { LinkManager } from "@/components/admin/LinkManager";
import { SponsorPackageManager } from "@/components/admin/SponsorPackageManager";
import { FormStatusManager } from "@/components/admin/FormStatusManager";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminFormbricksResponses, fetchAdminFormbricksTags } from "@/lib/api";
import type {
  AdminFormbricksResponseStats,
  AdminFormbricksResponseSummary,
  AdminMe,
} from "@/lib/types";
import { distinctTags } from "@/lib/responseTags";
import { TagFilterMenu, TAG_FILTER_HINT, effectiveTagSelection } from "@/components/admin/TagFilterMenu";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, computePagination, paginationSummary, type PaginationState } from "@/components/admin/pagination";

type FinishedFilter = "all" | "true" | "false";

export function AdminDashboard() {
  return (
    <AdminGuard>
      {(admin) => <AdminDashboardInner admin={admin} />}
    </AdminGuard>
  );
}

function AdminDashboardInner({ admin }: { admin: AdminMe }) {
  const [tab, setTab] = useState<AdminTab>("responses");
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [finished, setFinished] = useState<FinishedFilter>("true");
  // null = auto: every catalog tag is selected (the default). A manual array
  // persists until the survey changes — catalog refreshes never prune it, so
  // a label missing from the catalog stays applied until unchecked by hand.
  const [selectedTags, setSelectedTags] = useState<string[] | null>(null);
  const [tagCatalog, setTagCatalog] = useState<string[]>([]);
  // Survey whose tag catalog is resolved; responses wait for it so the first
  // fetch never fires a stale untagged query before the catalog is known.
  const [tagCatalogFor, setTagCatalogFor] = useState<string | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [responses, setResponses] = useState<
    AdminFormbricksResponseSummary[]
  >([]);
  const [total, setTotal] = useState<number | null>(null);
  const [stats, setStats] = useState<AdminFormbricksResponseStats | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Monotonic request id; drops stale responses that resolve after a newer request started.
  const requestIdRef = useRef(0);
  const tagRequestIdRef = useRef(0);

  const effectiveTags = effectiveTagSelection(selectedTags, tagCatalog);
  // True while the current survey's tag catalog is still loading — the table
  // shows the loading state so stale rows from the previous survey never read
  // as current.
  const tagsPending = surveyId !== null && tagCatalogFor !== surveyId;

  const load = useCallback(async () => {
    if (!surveyId) return;
    if (tagCatalogFor !== surveyId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    // Stats follow the request lifecycle: em dash while loading, never stale page counts.
    setStats(null);
    try {
      const data = await fetchAdminFormbricksResponses(surveyId, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        finished,
        tags: effectiveTags.length > 0 ? effectiveTags : undefined,
        untagged: effectiveTags.length === 0,
      });
      if (requestId !== requestIdRef.current) return;
      setResponses(data.items ?? []);
      setTotal(data.total);
      setStats(data.stats ?? null);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message ?? "Failed to load responses.");
      setResponses([]);
      setTotal(null);
      setStats(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [surveyId, tagCatalogFor, finished, page, effectiveTags]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTags = useCallback(async () => {
    if (!surveyId) return;
    const requestId = ++tagRequestIdRef.current;
    try {
      const data = await fetchAdminFormbricksTags(surveyId);
      if (requestId !== tagRequestIdRef.current) return;
      setTagCatalog(distinctTags(Array.isArray(data) ? data : []));
      setTagCatalogFor(surveyId);
      setTagsError(null);
    } catch (err: any) {
      // Keep the last good catalog; surface the failure so filtering can be
      // retried. The gate still opens — a tags failure must not block responses.
      if (requestId === tagRequestIdRef.current) {
        setTagsError(err?.message ?? "Failed to load tags.");
        setTagCatalogFor(surveyId);
      }
    }
  }, [surveyId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const onTagsSaved = useCallback(
    (responseId: string, tags: string[]) => {
      // Immediate badge refresh in the current page, then authoritative reloads.
      setResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, tags } : r)),
      );
      loadTags();
      // Always reload: in auto mode a failed tags refresh wouldn't change the
      // catalog, so the explicit call is the only reload trigger left.
      load();
    },
    [load, loadTags],
  );

  const onSelect = (id: string) => {
    setDetailId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <a
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-2 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Home
      </a>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as{" "}
            <span className="text-foreground font-medium">{admin.email}</span>
          </p>
        </div>
        {tab === "responses" && (
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || tagsPending || !surveyId}
            className="self-start sm:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      <AdminNavigation active={tab} onChange={setTab} />

      {/* Explicit tab branches; responses remains the default */}
      {tab === "forms" ? (
        <FormStatusManager />
      ) : tab === "links" ? (
        <LinkManager />
      ) : tab === "sponsors" ? (
        <SponsorPackageManager />
      ) : (
        <>
          {/* Filter row: labeled controls, one grid row, equal heights; stacks on mobile. */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px_260px] gap-3 mb-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label
                htmlFor="filter-form"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Form
              </label>
              <FormSelector
                id="filter-form"
                value={surveyId}
                onChange={(id) => {
                  setSurveyId(id);
                  setPage(1);
                  // Back to auto: the new survey selects its own full catalog,
                  // and responses wait until that catalog resolves.
                  setSelectedTags(null);
                  setTagCatalogFor(null);
                  setTagCatalog([]);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label
                htmlFor="filter-status"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Status
              </label>
              <Select
                value={finished}
                onValueChange={(v) => {
                  setFinished(v as FinishedFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger id="filter-status" className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All responses</SelectItem>
                  <SelectItem value="true">Finished only</SelectItem>
                  <SelectItem value="false">In progress only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label
                htmlFor="filter-tags"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Tags
              </label>
              <TagFilterMenu
                id="filter-tags"
                hintId="filter-tags-hint"
                selected={effectiveTags}
                catalog={tagCatalog}
                onChange={(next) => {
                  setSelectedTags(next);
                  setPage(1);
                }}
              />
            </div>
          </div>
          {/* Helper + tag errors sit outside the control row so they never
              push the three triggers out of alignment. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-5 text-xs text-muted-foreground">
            <span id="filter-tags-hint">Tags: {TAG_FILTER_HINT}</span>
            {tagsError && (
              <span
                className="flex items-center gap-2 text-destructive"
                role="alert"
              >
                <span className="truncate">Couldn't load tags: {tagsError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs shrink-0"
                  onClick={loadTags}
                >
                  Retry
                </Button>
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="mb-5">
            {/* Auto mode selects every tag, so counts always reflect an active
                filter (untagged responses are excluded either way). */}
            <AdminStatsCards stats={tagsPending ? null : stats} filtered />
          </div>

          {/* Body */}
          {loading || tagsPending ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card border border-border/80 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Loading responses…
              </p>
            </div>
          ) : error ? (
            <div className="bg-card border border-border/80 rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={load} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <FormbricksResponsesTable
                responses={responses}
                onSelect={onSelect}
              />
              {(responses.length > 0 || page > 1) && (
                <ResponsesPager
                  state={computePagination({
                    total,
                    itemCount: responses.length,
                    offset: (page - 1) * PAGE_SIZE,
                  })}
                  onPrev={() => setPage(page - 1)}
                  onNext={() => setPage(page + 1)}
                />
              )}
            </>
          )}

          <ResponseDetailDrawer
            key={detailId ?? "none"}
            responseId={detailId}
            surveyId={surveyId}
            availableTags={tagCatalog}
            onTagsSaved={onTagsSaved}
            open={drawerOpen}
            onOpenChange={(v) => {
              setDrawerOpen(v);
              if (!v) setDetailId(null);
            }}
          />
        </>
      )}
    </div>
  );
}

function ResponsesPager({
  state,
  onPrev,
  onNext,
}: {
  state: PaginationState;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <nav
      aria-label="Responses pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4"
    >
      <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
        {paginationSummary(state)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!state.hasPrev}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </Button>
        <span
          className="text-xs text-muted-foreground tabular-nums"
          aria-current="page"
        >
          Page {state.page}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!state.hasNext}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
