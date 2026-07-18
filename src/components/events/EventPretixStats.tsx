'use client';

import { useState, useEffect } from "react";
import { fetchPretixEventStats } from "@/lib/api";
import type { PretixEventStats } from "@/lib/types";
import { Users, ClipboardCheck, TrendingUp } from "lucide-react";

interface EventPretixStatsProps {
  siteSlug: string;
  organizerSlug: string;
  eventSlug: string;
  checkinListId?: string | null;
  subeventId?: string | null;
  eventDate?: string;
}

export function EventPretixStats({
  siteSlug,
  organizerSlug,
  eventSlug,
  checkinListId,
  subeventId,
  eventDate,
}: EventPretixStatsProps) {
  const [stats, setStats] = useState<PretixEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchPretixEventStats(
          siteSlug, organizerSlug, eventSlug, checkinListId ?? "", subeventId ?? null,
        );
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [siteSlug, organizerSlug, eventSlug, checkinListId, subeventId]);

  if (error) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-pulse bg-muted h-5 w-40 rounded" />
      </div>
    );
  }

  if (!stats) return null;

  const eventDt = eventDate ? new Date(eventDate) : null;
  const now = new Date();
  const isPast = eventDt ? eventDt < now && eventDt.toDateString() !== now.toDateString() : false;
  const rateDisplay = stats.attendance_rate != null
    ? `${(stats.attendance_rate * 100).toFixed(0)}%`
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 text-muted-foreground font-medium">
      <div className="flex items-center">
        <Users className="mr-2 h-5 w-5 text-primary" />
        <span>{stats.registered_count} Registered</span>
      </div>
      {isPast && (
        <div className="flex items-center">
          <ClipboardCheck className="mr-2 h-5 w-5 text-primary" />
          <span>{stats.checked_in_count} Checked In</span>
        </div>
      )}
      {isPast && rateDisplay && (
        <div className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" />
          <span>{rateDisplay} attendance</span>
        </div>
      )}
      {stats.stale && (
        <span className="text-amber-400 text-xs">(cached)</span>
      )}
    </div>
  );
}
