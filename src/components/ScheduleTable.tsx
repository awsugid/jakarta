"use client";

import React, { useState, useEffect, useMemo, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

// Simple markdown to HTML parser
function parseMarkdown(text: string): string {
  if (!text || typeof text !== "string") return text;

  let html = text;

  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Code: `text` -> <code>text</code>
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Links: [text](url) -> <a href="url">text</a>
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  return html;
}

// Types
type TimeColumnKey = "start" | "finish";

interface LinkConfig {
  text: string;
  href: string;
  external?: boolean;
}

type CellValue = string | LinkConfig | LinkConfig[] | undefined;

interface ScheduleRow {
  start: string;
  finish: string;
  [key: string]: CellValue;
}

interface ColumnDefinition {
  key: string;
  label: string;
  className?: string;
  hideOnMobile?: boolean;
}

interface ScheduleTableProps {
  columns: ColumnDefinition[];
  items: ScheduleRow[];
  eventDate: string; // ISO date string "2026-01-31"
  timezone?: string; // Default: "Asia/Jakarta"
  showDuration?: boolean;
  primaryColumn?: string;
  demoTime?: string; // Optional: "HH:MM" for testing. When set, uses this time instead of current time
}

type SessionStatus = "past" | "current" | "upcoming";

// Utility functions
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateDuration(start: string, finish: string): string {
  const startMins = parseTime(start);
  const finishMins = parseTime(finish);
  const durationMins = finishMins - startMins;
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}

function getSessionStatus(
  sessionStart: string,
  sessionEnd: string,
  eventDate: string,
  currentTime: Date,
  timezone: string = "Asia/Jakarta",
): SessionStatus {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(currentTime);
  const dateMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const currentDateStr = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;
  const currentTimeStr = `${dateMap.hour}:${dateMap.minute}`;

  const eventDateOnly = eventDate.split("T")[0];

  if (currentDateStr < eventDateOnly) {
    return "upcoming";
  }
  if (currentDateStr > eventDateOnly) {
    return "past";
  }

  const currentMins = parseTime(currentTimeStr);
  const startMins = parseTime(sessionStart);
  const endMins = parseTime(sessionEnd);

  if (currentMins < startMins) return "upcoming";
  if (currentMins >= startMins && currentMins <= endMins) return "current";
  return "past";
}

function useCurrentTime(updateInterval: number = 60000) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return currentTime;
}

// Cell rendering component
interface CellContentProps {
  value: CellValue;
}

function CellContent({ value }: CellContentProps) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof value === "string") {
    // Parse markdown in string values
    const html = parseMarkdown(value);
    return (
      <span
        dangerouslySetInnerHTML={{ __html: html }}
        className="[&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:hover:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded"
      />
    );
  }

  if (Array.isArray(value)) {
    return (
      <span className="inline-flex flex-wrap gap-x-2 gap-y-1">
        {value.map((link, i) => (
          <Fragment key={i}>
            <a
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {link.text}
              {link.external && <ExternalLink className="h-3 w-3" />}
            </a>
            {i < value.length - 1 && (
              <span className="text-muted-foreground">,</span>
            )}
          </Fragment>
        ))}
      </span>
    );
  }

  if ("href" in value) {
    const link = value as LinkConfig;
    return (
      <a
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        className="text-primary hover:underline inline-flex items-center gap-1"
      >
        {link.text}
        {link.external && <ExternalLink className="h-3 w-3" />}
      </a>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

// Mobile card component
interface MobileSessionCardProps {
  item: ScheduleRow;
  visibleColumns: ColumnDefinition[];
  primaryColumn?: string;
  status: SessionStatus;
  showDuration: boolean;
}

function MobileSessionCard({
  item,
  visibleColumns,
  primaryColumn,
  status,
  showDuration,
}: MobileSessionCardProps) {
  const startStr = item.start as string;
  const finishStr = item.finish as string;
  const duration = calculateDuration(startStr, finishStr);
  const durationStr = showDuration ? ` (${duration})` : "";

  const primaryCol = primaryColumn
    ? visibleColumns.find((c) => c.key === primaryColumn)
    : visibleColumns.find((c) => c.key !== "start" && c.key !== "finish");

  const otherColumns = visibleColumns.filter(
    (c) => c.key !== "start" && c.key !== "finish" && c.key !== primaryColumn,
  );

  const statusClasses = {
    past: "opacity-50",
    current: "border-l-4 border-primary bg-primary/10",
    upcoming: "",
  };

  return (
    <Card
      className={cn(
        "p-4 mb-3 transition-all",
        statusClasses[status],
        status === "current" && "ring-1 ring-primary",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-muted-foreground">
          {startStr} - {finishStr}
          {durationStr}
        </span>
        {status === "current" && (
          <Badge
            variant="default"
            className="animate-pulse bg-primary text-primary-foreground"
          >
            LIVE
          </Badge>
        )}
      </div>

      {primaryCol && (
        <div className="mb-2">
          <p className="font-semibold text-foreground">
            <CellContent value={item[primaryCol.key]} />
          </p>
        </div>
      )}

      {otherColumns.length > 0 && (
        <div className="space-y-1 text-sm">
          {otherColumns.map((col) => (
            <div key={col.key} className="flex gap-2">
              <span className="text-muted-foreground">{col.label}:</span>
              <CellContent value={item[col.key]} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Desktop table component
interface DesktopTableProps {
  items: ScheduleRow[];
  visibleColumns: ColumnDefinition[];
  statuses: SessionStatus[];
  showDuration: boolean;
}

function DesktopTable({
  items,
  visibleColumns,
  statuses,
  showDuration,
}: DesktopTableProps) {
  const displayColumns = showDuration
    ? [
        ...visibleColumns.slice(0, 2),
        { key: "duration", label: "Duration", className: "" },
        ...visibleColumns.slice(2),
      ]
    : visibleColumns;

  return (
    <div
      className="w-full overflow-x-auto border border-border rounded-lg"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <table
        className="w-full text-sm"
        style={{ borderCollapse: "collapse", margin: 0, padding: 0 }}
      >
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {displayColumns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2 text-left font-semibold text-foreground",
                  col.className,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const status = statuses[idx];
            const statusClasses = {
              past: "opacity-50 bg-transparent",
              current: "bg-primary/10 border-l-4 border-primary",
              upcoming: "hover:bg-muted/50",
            };

            return (
              <tr
                key={idx}
                className={cn(
                  "border-b border-border transition-colors",
                  statusClasses[status],
                )}
              >
                {displayColumns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-2", col.className)}>
                    {col.key === "duration" && showDuration ? (
                      calculateDuration(
                        item.start as string,
                        item.finish as string,
                      )
                    ) : (
                      <CellContent value={item[col.key]} />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Main component
export function ScheduleTable({
  columns,
  items,
  eventDate,
  timezone = "Asia/Jakarta",
  showDuration = false,
  primaryColumn,
  demoTime,
}: ScheduleTableProps) {
  const systemTime = useCurrentTime();

  // Check for demo time from URL query params (if running in browser)
  const [queryDemoTime, setQueryDemoTime] = React.useState<string | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const timeParam = params.get("demoTime");
      if (timeParam && timeParam !== queryDemoTime) {
        setQueryDemoTime(timeParam);
      }
    }
  }, [queryDemoTime]);

  // Use demo time from props first, then from query param, then system time
  const currentTime = useMemo(() => {
    const effectiveDemoTime = demoTime || queryDemoTime;
    if (effectiveDemoTime) {
      // Parse demo time and create a date object
      // We need to create a date that, when formatted in the event timezone,
      // will show the desired time. Since Asia/Jakarta is UTC+7,
      // we subtract 7 hours from the desired time to get UTC, then add back the offset.
      const [hours, minutes] = effectiveDemoTime.split(":").map(Number);

      // Create a date in UTC that represents the desired time in Asia/Jakarta
      // Asia/Jakarta is UTC+7, so we create a UTC date 7 hours behind
      const date = new Date();
      date.setUTCHours(hours - 7, minutes, 0, 0);
      date.setUTCDate(31); // Set to the 31st for consistency with event date
      date.setUTCMonth(0); // January
      date.setUTCFullYear(2026);
      return date;
    }
    return systemTime;
  }, [demoTime, queryDemoTime, systemTime]);

  const statuses = useMemo(
    () =>
      items.map((item) =>
        getSessionStatus(
          item.start as string,
          item.finish as string,
          eventDate,
          currentTime,
          timezone,
        ),
      ),
    [items, eventDate, currentTime, timezone, demoTime, queryDemoTime],
  );

  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hideOnMobile),
    [columns],
  );

  const allVisibleColumns = useMemo(() => columns, [columns]);

  return (
    <div className="w-full">
      {/* Mobile view */}
      <div className="sm:hidden space-y-3">
        {items.map((item, idx) => (
          <MobileSessionCard
            key={idx}
            item={item}
            visibleColumns={visibleColumns}
            primaryColumn={primaryColumn}
            status={statuses[idx]}
            showDuration={showDuration}
          />
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block">
        <DesktopTable
          items={items}
          visibleColumns={allVisibleColumns}
          statuses={statuses}
          showDuration={showDuration}
        />
      </div>
    </div>
  );
}

export default ScheduleTable;
