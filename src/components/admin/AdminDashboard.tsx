"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminNavigation, type AdminTab } from "@/components/admin/AdminNavigation";
import { FormSelector } from "@/components/admin/FormSelector";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import { FormbricksResponsesTable } from "@/components/admin/FormbricksResponsesTable";
import { ResponseDetailDrawer } from "@/components/admin/ResponseDetailDrawer";
import { LinkManager } from "@/components/admin/LinkManager";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminFormbricksResponses } from "@/lib/api";
import type {
  AdminFormbricksResponseSummary,
  AdminMe,
} from "@/lib/types";
import { ArrowLeft, Filter, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [finished, setFinished] = useState<FinishedFilter>("all");
  const [responses, setResponses] = useState<
    AdminFormbricksResponseSummary[]
  >([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminFormbricksResponses(surveyId, {
        limit: 50,
        offset: 0,
        finished,
      });
      setResponses(data.items ?? []);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load responses.");
      setResponses([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, [surveyId, finished]);

  useEffect(() => {
    load();
  }, [load]);

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

      {tab === "links" ? (
        <LinkManager />
      ) : (
        <>
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <FormSelector value={surveyId} onChange={setSurveyId} />
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={finished}
                onValueChange={(v) => setFinished(v as FinishedFilter)}
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
            <FormbricksResponsesTable
              responses={responses}
              onSelect={onSelect}
            />
          )}

          <ResponseDetailDrawer
            responseId={detailId}
            surveyId={surveyId}
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
