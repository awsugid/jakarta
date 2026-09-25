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
  AdminFormbricksResponseSummary,
  AdminMe,
} from "@/lib/types";
import { distinctTags } from "@/lib/responseTags";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Loader2, RefreshCw, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, computePagination, paginationSummary, type PaginationState } from "@/components/admin/pagination";

type FinishedFilter = "all" | "true" | "false";

// Prefixed option values stop a literal tag named "all" from colliding with
// the sentinel; the prefix is stripped on change and never displayed.
const TAG_ALL = "all";
const TAG_VALUE_PREFIX = "tag:";

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
  const [finished, setFinished] = useState<FinishedFilter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [tagCatalog, setTagCatalog] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [responses, setResponses] = useState<
    AdminFormbricksResponseSummary[]
  >([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Monotonic request id; drops stale responses that resolve after a newer request started.
  const requestIdRef = useRef(0);
  const tagRequestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!surveyId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminFormbricksResponses(surveyId, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        finished,
        tag: tagFilter || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setResponses(data.items ?? []);
      setTotal(data.total);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err?.message ?? "Failed to load responses.");
      setResponses([]);
      setTotal(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [surveyId, finished, page, tagFilter]);

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
      setTagsError(null);
    } catch (err: any) {
      // Keep the last good catalog; surface the failure so filtering can be retried.
      if (requestId === tagRequestIdRef.current) {
        setTagsError(err?.message ?? "Failed to load tags.");
      }
    }
  }, [surveyId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // A successful fetch is authoritative, even when empty: a label missing from
  // the catalog means its last assignment is gone. Keep filters during errors.
  useEffect(() => {
    if (tagsError === null && tagFilter && !tagCatalog.includes(tagFilter)) {
      setTagFilter("");
      setPage(1);
    }
  }, [tagFilter, tagCatalog, tagsError]);

  const onTagsSaved = useCallback(
    (responseId: string, tags: string[]) => {
      // Immediate badge refresh in the current page, then authoritative reloads.
      setResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, tags } : r)),
      );
      load();
      loadTags();
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
            disabled={loading || !surveyId}
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
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <FormSelector
              value={surveyId}
              onChange={(id) => {
                setSurveyId(id);
                setPage(1);
                setTagFilter("");
              }}
            />
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={finished}
                onValueChange={(v) => {
                  setFinished(v as FinishedFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All responses</SelectItem>
                  <SelectItem value="true">Finished only</SelectItem>
                  <SelectItem value="false">In progress only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <Select
                  value={tagFilter ? `${TAG_VALUE_PREFIX}${tagFilter}` : TAG_ALL}
                  onValueChange={(v) => {
                    setTagFilter(
                      v.startsWith(TAG_VALUE_PREFIX) ? v.slice(TAG_VALUE_PREFIX.length) : "",
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TAG_ALL}>All tags</SelectItem>
                    {tagCatalog.map((t) => (
                      <SelectItem key={t} value={`${TAG_VALUE_PREFIX}${t}`}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tagsError && (
                <div
                  className="flex items-center gap-2 text-xs text-destructive"
                  role="alert"
                >
                  <span className="truncate">Tags: {tagsError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs shrink-0"
                    onClick={loadTags}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mb-5">
            <AdminStatsCards responses={responses} total={total} />
          </div>

          {/* Body */}
          {loading ? (
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
