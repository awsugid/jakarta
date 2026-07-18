"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AdminFormbricksResponseSummary } from "@/lib/types";
import { CheckCircle2, Clock, Inbox, Timer } from "lucide-react";

function formatLatest(items: AdminFormbricksResponseSummary[]): string {
  const dates = items
    .map((i) => (i.submitted_at ?? i.updated_at) ?? null)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t));
  if (dates.length === 0) return "—";
  const latest = new Date(Math.max(...dates));
  return latest.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminStatsCards({
  responses,
  total,
}: {
  responses: AdminFormbricksResponseSummary[];
  total: number | null;
}) {
  const finished = responses.filter((r) => r.finished).length;
  const unfinished = responses.length - finished;
  const totalLabel = total != null ? total : responses.length;

  const stats = [
    {
      label: "Total",
      value: String(totalLabel),
      icon: Inbox,
      hint: total != null ? "across all pages" : "current page",
    },
    {
      label: "Finished",
      value: String(finished),
      icon: CheckCircle2,
      hint: "current page",
    },
    {
      label: "In Progress",
      value: String(unfinished),
      icon: Clock,
      hint: "current page",
    },
    {
      label: "Latest Submission",
      value: formatLatest(responses),
      icon: Timer,
      hint: "current page",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="bg-card border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold text-foreground truncate">
              {s.value}
            </span>
            <span className="text-[10px] text-muted-foreground">{s.hint}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
