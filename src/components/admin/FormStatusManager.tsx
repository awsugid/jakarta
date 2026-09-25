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
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { fetchAdminForms, updateAdminFormStatus } from "@/lib/api";
import type { AdminFormSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { divisions, nameToSlug } from "@/data/volunteer-divisions";

// Build a reverse map: slug → DivisionItem (for icon + description)
const slugToDivision = Object.fromEntries(
  divisions.map((d) => [nameToSlug[d.name], d]),
);

export function FormStatusManager() {
  const [forms, setForms] = useState<AdminFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError(null);
    try {
      const data = await fetchAdminForms();
      // Only volunteer forms, ordered to match the divisions list
      const volunteerForms = data.filter((f) => f.kind === "volunteer");
      volunteerForms.sort((a, b) => {
        const slugOrder = divisions.map((d) => nameToSlug[d.name]);
        const ai = slugOrder.indexOf(a.slug);
        const bi = slugOrder.indexOf(b.slug);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      setForms(volunteerForms);
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
    setUpdatingKey(form.slug);
    setUpdateError(null);
    try {
      const updated = await updateAdminFormStatus(form.kind, form.slug, {
        is_active: !form.is_active,
      });
      setForms((prev) => prev.map((f) => (f.slug === form.slug ? updated : f)));
    } catch (e: any) {
      setUpdateError(e?.message ?? `Failed to update ${form.title}.`);
    } finally {
      setUpdatingKey(null);
    }
  };

  /** Bulk-switch all volunteer categories to the target mode (Recruiting / Talent Pool). */
  const handleBulkToggle = async (targetActive: boolean) => {
    const targets = forms.filter((f) => f.is_active !== targetActive);
    if (targets.length === 0) return;
    setUpdateError(null);
    for (const form of targets) {
      setUpdatingKey(form.slug);
      try {
        const updated = await updateAdminFormStatus(form.kind, form.slug, {
          is_active: targetActive,
        });
        setForms((prev) =>
          prev.map((f) => (f.slug === form.slug ? updated : f)),
        );
      } catch (e: any) {
        setUpdateError(e?.message ?? `Failed to update ${form.title}.`);
        setUpdatingKey(null);
        return;
      }
    }
    setUpdatingKey(null);
  };

  const filteredForms = searchQuery.trim()
    ? forms.filter((f) => {
        const q = searchQuery.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.slug.toLowerCase().includes(q) ||
          (f.description?.toLowerCase().includes(q) ?? false)
        );
      })
    : forms;

  const totalCount = forms.length;
  const openCount = forms.filter((f) => f.is_active).length;
  const closedCount = totalCount - openCount;
  const allOpen = totalCount > 0 && openCount === totalCount;
  const allClosed = totalCount > 0 && closedCount === totalCount;
  const isBulkUpdating = forms.some((f) => updatingKey === f.slug);
  // Null count on any form means the total is unknown — show — instead of a
  // partial sum. Per-row counts still render individually.
  const totalResponses = forms.some((f) => f.response_count == null)
    ? null
    : forms.reduce((sum, f) => sum + (f.response_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Responses
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">
                  {totalResponses ?? "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  across {totalCount} categor{totalCount === 1 ? "y" : "ies"}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Recruiting
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
                  Talent Pool
                </p>
                <h3 className="text-2xl font-bold mt-1 text-muted-foreground">
                  {closedCount}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
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
              <CardTitle className="text-lg">
                Volunteer Category Configuration
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Switch each volunteer category between Recruiting and Talent
                Pool. Talent Pool categories keep accepting talent pool
                applications — nothing is closed or removed. Use{" "}
                <span className="font-medium text-foreground">
                  All Recruiting
                </span>{" "}
                /{" "}
                <span className="font-medium text-foreground">
                  All Talent Pool
                </span>{" "}
                to bulk-change every category, or switch each one individually.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="self-start sm:self-auto flex items-center gap-1.5 h-8 text-xs cursor-pointer"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search + bulk actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search category by name or slug…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={isBulkUpdating || allOpen || totalCount === 0}
                onClick={() => handleBulkToggle(true)}
                className="h-9 text-xs px-3 gap-1.5 cursor-pointer border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60 disabled:opacity-40"
              >
                {isBulkUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                All Recruiting
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBulkUpdating || allClosed || totalCount === 0}
                onClick={() => handleBulkToggle(false)}
                className="h-9 text-xs px-3 gap-1.5 cursor-pointer border-border/60 text-muted-foreground hover:bg-muted hover:border-border disabled:opacity-40"
              >
                {isBulkUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
                All Talent Pool
              </Button>
            </div>
          </div>

          {/* Aggregate status */}
          {!loading && !error && totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Overall status:</span>
              <Badge
                className={cn(
                  "text-[10px] h-4 px-1.5",
                  allOpen
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"
                    : allClosed
                    ? "bg-muted text-muted-foreground border border-border/50 hover:bg-muted"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/10",
                )}
              >
                {allOpen
                  ? "All Categories Recruiting"
                  : allClosed
                  ? "All Categories Talent Pool"
                  : `${openCount} / ${totalCount} Recruiting`}
              </Badge>
            </div>
          )}

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
              <p className="text-xs text-muted-foreground">
                Loading categories…
              </p>
            </div>
          )}

          {!loading && !error && filteredForms.length === 0 && (
            <div className="py-12 text-center border border-dashed border-border rounded-lg">
              <p className="text-sm font-medium text-foreground">
                No categories found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search."
                  : "No volunteer category forms have been registered in the database."}
              </p>
            </div>
          )}

          {/* Category cards grid */}
          {!loading && !error && filteredForms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredForms.map((form) => {
                const isUpdating = updatingKey === form.slug;
                const division = slugToDivision[form.slug];
                const Icon = division?.icon;

                return (
                  <div
                    key={form.slug}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-lg border transition-all duration-200 bg-background",
                      form.is_active
                        ? "border-border hover:border-border/80 shadow-xs"
                        : "border-border/50 bg-muted/20 hover:bg-muted/30",
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        {/* Category icon + slug */}
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <div
                              className={cn(
                                "p-1.5 rounded-md shrink-0 transition-colors",
                                form.is_active
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {form.slug}
                          </span>
                        </div>

                        {/* Recruiting / Talent Pool badge */}
                        {form.is_active ? (
                          <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Recruiting
                          </Badge>
                        ) : (
                          <Badge
                            className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 shrink-0"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Talent Pool
                          </Badge>
                        )}
                      </div>

                      {/* Title & description */}
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {form.title}
                        </h4>
                        {form.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {form.description}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Users className="h-3 w-3 shrink-0" />
                          {form.response_count != null
                            ? `${form.response_count} response${form.response_count === 1 ? "" : "s"}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 gap-2">
                      <a
                        href="/volunteer"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View page
                      </a>

                      <Button
                        size="sm"
                        variant={form.is_active ? "outline" : "default"}
                        disabled={isUpdating}
                        onClick={() => handleToggle(form)}
                        className={cn(
                          "h-8 text-xs cursor-pointer gap-1.5 font-medium",
                          form.is_active
                            ? "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white",
                        )}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : form.is_active ? (
                          <Users className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {form.is_active ? "Talent Pool" : "Recruiting"}
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
