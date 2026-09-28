import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Sparkles, Building2, AlertCircle, Loader2 } from "lucide-react";
import type { EventSponsor } from "@/lib/types";
import { SponsorFilterBar } from "../molecules/SponsorFilterBar";
import { SponsorListItem } from "./SponsorListItem";
import { cn } from "@/lib/utils";

interface SponsorListContainerProps {
  sponsors: EventSponsor[];
  totalSponsorsCount: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  onRefresh: () => void;
  onAddSponsor: () => void;
  onMoveSponsor: (index: number, direction: "up" | "down") => void;
  onToggleActive: (sponsor: EventSponsor) => void;
  onEdit: (sponsor: EventSponsor) => void;
  onDelete: (sponsor: EventSponsor) => void;
  reordering?: boolean;
}

export function SponsorListContainer({
  sponsors,
  totalSponsorsCount,
  loading,
  error,
  searchQuery,
  onSearchChange,
  selectedTier,
  onTierChange,
  selectedStatus,
  onStatusChange,
  onResetFilters,
  hasActiveFilters,
  onRefresh,
  onAddSponsor,
  onMoveSponsor,
  onToggleActive,
  onEdit,
  onDelete,
  reordering = false,
}: SponsorListContainerProps) {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4 space-y-4">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 font-bold tracking-tight">
              <Sparkles className="h-5 w-5 text-orange-400" />
              Sponsor Directory Configuration
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Manage confirmed sponsors, branding assets, tier placement, nominal commitments, and live visibility.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading || reordering}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={onAddSponsor}
              className="gap-1.5 text-xs h-9 bg-orange-600 hover:bg-orange-700 text-white font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Sponsor
            </Button>
          </div>
        </div>

        {/* Filter Bar Molecule */}
        <SponsorFilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedTier={selectedTier}
          onTierChange={onTierChange}
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          onReset={onResetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading sponsor list…
            </p>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button onClick={onRefresh} variant="outline" size="sm" className="mt-2">
              Retry
            </Button>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-base font-semibold text-foreground">No sponsors found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {totalSponsorsCount === 0
                ? "Get started by registering the first sponsor for this event."
                : "No sponsors match the current filter criteria. Try resetting the filters."}
            </p>
            {totalSponsorsCount === 0 ? (
              <Button
                onClick={onAddSponsor}
                size="sm"
                className="mt-2 bg-orange-600 hover:bg-orange-700 text-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Sponsor
              </Button>
            ) : hasActiveFilters ? (
              <Button
                onClick={onResetFilters}
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <div>
            {sponsors.map((sponsor, index) => (
              <SponsorListItem
                key={sponsor.id}
                sponsor={sponsor}
                index={index}
                totalCount={sponsors.length}
                onMoveUp={() => onMoveSponsor(index, "up")}
                onMoveDown={() => onMoveSponsor(index, "down")}
                onToggleActive={() => onToggleActive(sponsor)}
                onEdit={() => onEdit(sponsor)}
                onDelete={() => onDelete(sponsor)}
                disabledControls={reordering}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
