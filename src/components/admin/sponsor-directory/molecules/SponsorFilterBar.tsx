import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STANDARD_TIERS } from "../atoms/SponsorTierBadge";

interface SponsorFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTier: string;
  onTierChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function SponsorFilterBar({
  searchQuery,
  onSearchChange,
  selectedTier,
  onTierChange,
  selectedStatus,
  onStatusChange,
  onReset,
  hasActiveFilters,
}: SponsorFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, description, tier..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8 h-10 bg-background/60 border-border/80 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Tier Filter */}
        <Select value={selectedTier} onValueChange={onTierChange}>
          <SelectTrigger className="w-[150px] h-10 bg-background/60 text-xs">
            <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tiers</SelectItem>
            {STANDARD_TIERS.map((tier) => (
              <SelectItem key={tier.value} value={tier.value}>
                {tier.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[130px] h-10 bg-background/60 text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active Only</SelectItem>
            <SelectItem value="INACTIVE">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
