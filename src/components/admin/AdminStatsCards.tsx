"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AdminFormbricksResponseStats } from "@/lib/types";
import { CheckCircle2, Clock, Inbox, Timer } from "lucide-react";

const EM_DASH = "—";

function formatLatest(latest: string | null): string {
  if (!latest) return EM_DASH;
  const time = new Date(latest).getTime();
  if (isNaN(time)) return EM_DASH;
  return new Date(time).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Pure so the em-dash-on-missing rule stays testable without a DOM. */
export function buildStatsCards(
  stats: AdminFormbricksResponseStats | null,
  filtered: boolean,
) {
  const hint = filtered ? "all pages · filtered" : "across all pages";
  return [
    {
      label: "Total",
      value: stats ? String(stats.total) : EM_DASH,
      icon: Inbox,
      hint,
    },
    {
      label: "Finished",
      value: stats ? String(stats.finished) : EM_DASH,
      icon: CheckCircle2,
      hint,
    },
    {
      label: "In Progress",
      value: stats ? String(stats.in_progress) : EM_DASH,
      icon: Clock,
      hint,
    },
    {
      label: "Latest Submission",
      value: stats ? formatLatest(stats.latest_submission) : EM_DASH,
      icon: Timer,
      hint,
    },
  ];
}

export function AdminStatsCards({
  stats,
  filtered,
}: {
  /** Aggregate across all pages for the current filters; null = loading/error/missing. */
  stats: AdminFormbricksResponseStats | null;
  filtered: boolean;
}) {
  const cards = buildStatsCards(stats, filtered);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="bg-card border-border/80">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold text-foreground truncate">
              {c.value}
            </span>
            <span className="text-[10px] text-muted-foreground">{c.hint}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
