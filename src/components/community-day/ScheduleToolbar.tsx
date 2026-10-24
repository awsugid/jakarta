import React from "react";
import {
  LayoutGrid,
  ListFilter,
  Search,
  Star,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ScheduleViewMode } from "./schedule-types";

export interface RoomOption {
  key: string;
  name: string;
  track: string;
  count: number;
}

interface ScheduleToolbarProps {
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
  selectedRoom: string;
  onRoomChange: (room: string) => void;
  distinctRoomOptions: RoomOption[];
  onlySaved: boolean;
  onToggleOnlySaved: () => void;
  savedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDownloadIcs: () => void;
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function ScheduleToolbar({
  viewMode,
  onViewModeChange,
  selectedRoom,
  onRoomChange,
  distinctRoomOptions,
  onlySaved,
  onToggleOnlySaved,
  savedCount,
  searchQuery,
  onSearchChange,
  onDownloadIcs,
  filteredCount,
  totalCount,
  hasActiveFilters,
  onResetFilters,
}: ScheduleToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Top Controls & Unified Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/70 shadow-sm">
        {/* Left: View Mode Toggle & Track Filter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Mode Switcher */}
          <div className="schedule-seg-wrapper w-full sm:w-auto inline-flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0">
            <button
              type="button"
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                viewMode === "board"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "board"}
              onClick={() => onViewModeChange("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          {/* Track Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => onRoomChange("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                selectedRoom === "ALL" && !onlySaved
                  ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                  : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
              )}
            >
              All Tracks
            </button>

            {distinctRoomOptions.map((opt) => (
              <button
                key={opt.name}
                type="button"
                onClick={() => onRoomChange(opt.name)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5",
                  (selectedRoom.toLowerCase() === opt.name.toLowerCase() ||
                    (selectedRoom.toLowerCase().includes("800") && opt.name.toLowerCase().includes("800"))) &&
                    !onlySaved
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    opt.name.toLowerCase().includes("atrium") ? "bg-orange-500" : "bg-purple-400"
                  )}
                />
                <span>
                  {opt.name} <span className="opacity-75">({opt.track})</span>
                </span>
              </button>
            ))}

            {/* Saved talks shortcut */}
            <button
              type="button"
              onClick={onToggleOnlySaved}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border",
                onlySaved
                  ? "bg-amber-500 text-white border-amber-500 font-bold shadow-xs"
                  : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-muted/50"
              )}
              title="Show only bookmarked talks"
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  savedCount > 0 || onlySaved ? "fill-current text-current" : ""
                )}
              />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="text-[10px] font-bold opacity-90">({savedCount})</span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Search & Bulk .ICS Export */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search talks, speakers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-7 h-8.5 text-xs bg-background/60 border-border/60 focus:border-orange-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadIcs}
            className="h-8.5 text-xs font-medium cursor-pointer shrink-0"
            title="Download full conference calendar (.ics)"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-orange-400" />
            <span>.ICS</span>
          </Button>
        </div>
      </div>

      {/* Filter Active Status Feedback */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{filteredCount}</strong> of{" "}
            {totalCount} sessions
            {selectedRoom !== "ALL" && ` in ${selectedRoom}`}
            {onlySaved && " • Saved only"}
          </span>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline"
          >
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}
