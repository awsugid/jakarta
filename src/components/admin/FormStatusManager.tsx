"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ExternalLink,
  Filter,
  HandHeart,
  Loader2,
  Mic,
  Power,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { fetchAdminForms, updateAdminFormStatus } from "@/lib/api";
import type { AdminFormSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "volunteer" | "speaker";

export function FormStatusManager() {
  const [forms, setForms] = useState<AdminFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError(null);
    try {
      const data = await fetchAdminForms();
      setForms(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (form: AdminFormSummary) => {
    const key = `${form.kind}-${form.slug}`;
    setUpdatingKey(key);
    setUpdateError(null);
    const newStatus = !form.is_active;

    try {
      const updated = await updateAdminFormStatus(form.kind, form.slug, {
        is_active: newStatus,
      });
      setForms((prev) =>
        prev.map((f) =>
          f.kind === form.kind && f.slug === form.slug ? updated : f,
        ),
      );
    } catch (e: any) {
      setUpdateError(
        e?.message ?? `Failed to update status for ${form.title}.`,
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredForms = forms.filter((f) => {
    if (kindFilter !== "all" && f.kind !== kindFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchSlug = f.slug.toLowerCase().includes(q);
      const matchDesc = f.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchSlug && !matchDesc) return false;
    }
    return true;
  });

  const totalCount = forms.length;
  const openCount = forms.filter((f) => f.is_active).length;
  const closedCount = totalCount - openCount;

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Forms
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {totalCount}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Filter className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Registration Open
                </p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {openCount}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Registration Closed
                </p>
                <h3 className="text-2xl font-bold mt-1 text-muted-foreground">
                  {closedCount}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="bg-card border-border/80">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Volunteer & Registration Status Configuration</CardTitle>
              <CardDescription className="text-xs mt-1">
                Open or close volunteer division applications and speaker CFP registration in real time.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="self-start sm:self-auto flex items-center gap-1.5 h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls: search and kind filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search forms by title, slug, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60">
              <Button
                variant={kindFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setKindFilter("all")}
                className="h-7 text-xs px-3 cursor-pointer"
              >
                All
              </Button>
              <Button
                variant={kindFilter === "volunteer" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setKindFilter("volunteer")}
                className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
              >
                <HandHeart className="h-3 w-3" />
                Volunteers
              </Button>
              <Button
                variant={kindFilter === "speaker" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setKindFilter("speaker")}
                className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
              >
                <Mic className="h-3 w-3" />
                Speakers
              </Button>
            </div>
          </div>

          {updateError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
              {updateError}
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
              {error}
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Loading forms…</p>
            </div>
          )}

          {!loading && !error && filteredForms.length === 0 && (
            <div className="py-12 text-center border border-dashed border-border rounded-lg">
              <p className="text-sm font-medium text-foreground">No forms found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || kindFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "No application forms have been registered in the database."}
              </p>
            </div>
          )}

          {!loading && !error && filteredForms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredForms.map((form) => {
                const key = `${form.kind}-${form.slug}`;
                const isUpdating = updatingKey === key;
                const isVolunteer = form.kind === "volunteer";

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-lg border transition-all duration-200 bg-background",
                      form.is_active
                        ? "border-border hover:border-border/80 shadow-xs"
                        : "border-border/50 bg-muted/20 opacity-80 hover:opacity-100",
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={isVolunteer ? "secondary" : "outline"}
                            className="text-[10px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider"
                          >
                            {isVolunteer ? (
                              <span className="flex items-center gap-1">
                                <HandHeart className="h-2.5 w-2.5" /> Volunteer
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Mic className="h-2.5 w-2.5" /> Speaker
                              </span>
                            )}
                          </Badge>
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {form.slug}
                          </span>
                        </div>

                        {form.is_active ? (
                          <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground border-muted-foreground/30 shrink-0"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {form.title}
                        </h4>
                        {form.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 gap-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={
                            form.kind === "volunteer"
                              ? "/volunteer"
                              : "/speakers"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View page
                        </a>
                      </div>

                      <Button
                        size="sm"
                        variant={form.is_active ? "destructive" : "default"}
                        disabled={isUpdating}
                        onClick={() => handleToggle(form)}
                        className={cn(
                          "h-8 text-xs cursor-pointer gap-1.5 font-medium",
                          !form.is_active && "bg-emerald-600 hover:bg-emerald-700 text-white",
                        )}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Power className="h-3 w-3" />
                        )}
                        {form.is_active ? "Close Registration" : "Open Registration"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
