"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminFormbricksResponseSummary } from "@/lib/types";
import { Eye } from "lucide-react";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinPreview(
  preview: Record<string, string | number | boolean | string[] | null>,
): { firstKey: string; firstValue: string; full: string } {
  const entries = Object.entries(preview);
  if (entries.length === 0) return { firstKey: "", firstValue: "—", full: "" };
  const render = (v: string | number | boolean | string[] | null): string => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  };
  const [firstKey, firstVal] = entries[0];
  const full = entries
    .map(([k, v]) => `${k}: ${render(v)}`)
    .join(" · ");
  return { firstKey, firstValue: render(firstVal) || "—", full };
}

export function FormbricksResponsesTable({
  responses,
  onSelect,
}: {
  responses: AdminFormbricksResponseSummary[];
  onSelect: (id: string) => void;
}) {
  if (responses.length === 0) {
    return (
      <Card className="bg-card border-border/80">
        <CardContent className="p-12 text-center space-y-2">
          <p className="text-lg font-semibold text-foreground">
            No responses
          </p>
          <p className="text-sm text-muted-foreground">
            No Formbricks responses match the current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <Card className="hidden md:block bg-card border-border/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-[180px]">Submitted</TableHead>
              <TableHead className="w-[220px]">Respondent</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-[100px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((r) => {
              const preview = joinPreview(r.preview_answers);
              const respondent =
                r.respondent_name || r.respondent_email || "Anonymous";
              return (
                <TableRow
                  key={r.id}
                  className="border-border/60 cursor-pointer"
                  onClick={() => onSelect(r.id)}
                >
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(r.submitted_at ?? r.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground truncate">
                      {respondent}
                    </div>
                    {r.respondent_email && r.respondent_name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {r.respondent_email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.finished ? (
                      <Badge className="border-transparent bg-green-500/10 text-green-500">
                        Finished
                      </Badge>
                    ) : (
                      <Badge className="border-transparent bg-yellow-500/10 text-yellow-500">
                        In Progress
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    {preview.firstKey && (
                      <div className="text-xs text-muted-foreground">
                        {preview.firstKey}
                      </div>
                    )}
                    <div className="text-sm text-foreground truncate">
                      {preview.firstValue}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(r.id);
                      }}
                      className="text-primary hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-3">
        {responses.map((r) => {
          const preview = joinPreview(r.preview_answers);
          const respondent =
            r.respondent_name || r.respondent_email || "Anonymous";
          return (
            <Card key={r.id} className="bg-card border-border/80">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {respondent}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(r.submitted_at ?? r.updated_at)}
                    </div>
                  </div>
                  {r.finished ? (
                    <Badge className="border-transparent bg-green-500/10 text-green-500">
                      Finished
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-yellow-500/10 text-yellow-500">
                      In Progress
                    </Badge>
                  )}
                </div>
                {preview.firstKey && (
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {preview.firstKey}
                    </div>
                    <div className="text-sm text-foreground line-clamp-2">
                      {preview.full || preview.firstValue}
                    </div>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8"
                  onClick={() => onSelect(r.id)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View Detail
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
