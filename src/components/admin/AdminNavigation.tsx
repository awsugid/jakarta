"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminTab = "responses" | "links" | "sponsors";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "responses", label: "Responses" },
  { id: "links", label: "Links" },
  { id: "sponsors", label: "ComDay Sponsors" },
];

export function AdminNavigation({
  active,
  onChange,
}: {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Admin sections"
      className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-6 border-b border-border/60"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <Button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            variant="ghost"
            onClick={() => onChange(t.id)}
            className={cn(
              "justify-start sm:justify-center rounded-none border-b-2 -mb-px h-11 px-4",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}
