"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { distinctTags, sameTag } from "@/lib/responseTags";
import { ChevronDown, ListChecks, X } from "lucide-react";

export const TAG_FILTER_HINT =
  "Matches any selected tag. No selection shows untagged responses.";

/**
 * Selection state contract shared with the dashboard: `null` = auto — follow
 * the catalog (every tag selected); an array is a manual selection that
 * catalog refreshes never touch.
 */
export function effectiveTagSelection(
  selection: string[] | null,
  catalog: string[],
): string[] {
  return selection ?? catalog;
}

/** Pure: true when every catalog label is selected (case-insensitive). */
export function isAllCatalogSelected(
  selected: string[],
  catalog: string[],
): boolean {
  return (
    catalog.length > 0 &&
    catalog.every((c) => selected.some((s) => sameTag(s, c)))
  );
}

/** Pure: trigger summary — "All tags" / "Untagged" / labels with overflow count. */
export function tagFilterSummary(selected: string[], catalog: string[] = []): string {
  if (isAllCatalogSelected(selected, catalog)) return "All tags";
  if (selected.length === 0) return "Untagged";
  if (selected.length === 1) return selected[0];
  const rest = selected.length - 2;
  return rest > 0
    ? `${selected[0]}, ${selected[1]} +${rest}`
    : `${selected[0]}, ${selected[1]}`;
}

/** Pure: toggle one label, case-insensitive per responseTags rules; additions append. */
export function toggleTag(selected: string[], label: string): string[] {
  return selected.some((t) => sameTag(t, label))
    ? selected.filter((t) => !sameTag(t, label))
    : [...selected, label];
}

/** Pure: select-all adds every catalog label; manually chosen extras survive. */
export function selectAllTags(selected: string[], catalog: string[]): string[] {
  return distinctTags([...selected, ...catalog]);
}

export function TagFilterMenu({
  selected,
  catalog,
  onChange,
  id,
  hintId,
}: {
  /** Effective selection (auto mode passes the catalog itself). */
  selected: string[];
  catalog: string[];
  onChange: (next: string[]) => void;
  /** Trigger id, paired with the parent's visible label. */
  id?: string;
  /** Hint element id for aria-describedby; the hint renders outside this control. */
  hintId?: string;
}) {
  // Selected labels missing from the catalog stay listed (and stay applied) so
  // filters are never silently dropped; they can still be unchecked by hand.
  const options = distinctTags([...catalog, ...selected]);
  const allSelected = isAllCatalogSelected(selected, catalog);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          aria-describedby={hintId}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{tagFilterSummary(selected, catalog)}</span>
          <ChevronDown
            className="h-4 w-4 opacity-50 shrink-0"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-60 max-h-72 overflow-y-auto"
      >
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No tags yet
          </p>
        ) : (
          options.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={selected.some((t) => sameTag(t, tag))}
              onCheckedChange={() => onChange(toggleTag(selected, tag))}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="truncate">{tag}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
        {options.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {!allSelected && (
              <DropdownMenuItem
                onClick={() => onChange(selectAllTags(selected, catalog))}
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> Select
                all
              </DropdownMenuItem>
            )}
            {selected.length > 0 && (
              <DropdownMenuItem onClick={() => onChange([])}>
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear selection
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
