import { useState, useMemo } from "react";
import { Plus, Search, Filter, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SponsorPackage, SponsorPackageGroup } from "@/lib/types";
import type { PackageDraft } from "../types";
import { SponsorPackageCard } from "./SponsorPackageCard";

interface SponsorPackagesTabProps {
  packages: SponsorPackage[];
  groups: SponsorPackageGroup[];
  drafts: Record<string, PackageDraft>;
  dirtyIds: string[];
  exchangeRate: number;
  onUpdateDraft: (id: string, patch: Partial<PackageDraft>) => void;
  onOpenAddPackage: (groupId?: string) => void;
  onOpenDelete: (id: string, name: string) => void;
  deleteBlocked: boolean;
  dragDisabled: boolean;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDropOnGroup: (groupId: string) => void;
}

export function SponsorPackagesTab({
  packages,
  groups,
  drafts,
  dirtyIds,
  exchangeRate,
  onUpdateDraft,
  onOpenAddPackage,
  onOpenDelete,
  deleteBlocked,
  dragDisabled,
  onDragStart,
  onDragEnd,
  onDropOnGroup,
}: SponsorPackagesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const draft = drafts[p.id];
      const name = draft?.name || p.name;
      const desc = draft?.advantage || p.advantage;
      const groupId = draft?.groupId ?? p.groupId ?? "";

      const matchesSearch =
        searchQuery.trim() === "" ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup =
        selectedGroupFilter === "all" || groupId === selectedGroupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [packages, drafts, searchQuery, selectedGroupFilter]);

  // Grouped structure
  const groupedPackages = useMemo(() => {
    const map = new Map<string, SponsorPackage[]>();
    for (const g of groups) {
      map.set(g.id, []);
    }
    const unassigned: SponsorPackage[] = [];

    for (const p of filteredPackages) {
      const gid = drafts[p.id]?.groupId ?? p.groupId ?? "";
      if (map.has(gid)) {
        map.get(gid)!.push(p);
      } else {
        unassigned.push(p);
      }
    }

    return { map, unassigned };
  }, [filteredPackages, groups, drafts]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 border border-border/80 p-3 sm:p-4 rounded-2xl">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search packages by name or benefit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <Select
            value={selectedGroupFilter}
            onValueChange={setSelectedGroupFilter}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs bg-background shrink-0">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => onOpenAddPackage()}
          className="h-9 font-semibold text-xs cursor-pointer gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Package
        </Button>
      </div>

      {/* Sections by Group */}
      <div className="space-y-8">
        {groups.map((group) => {
          const pkgs = groupedPackages.map.get(group.id) || [];
          if (selectedGroupFilter !== "all" && selectedGroupFilter !== group.id) {
            return null;
          }

          return (
            <div
              key={group.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDropOnGroup(group.id);
              }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {group.label}
                  </h3>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {pkgs.length} {pkgs.length === 1 ? "package" : "packages"}
                  </Badge>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAddPackage(group.id)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to group
                </Button>
              </div>

              {pkgs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground text-xs bg-muted/10">
                  No packages in this group matching filter. Drag a package here or click "Add to group".
                </div>
              ) : (
                <div className="space-y-3">
                  {pkgs.map((pkg) => (
                    <SponsorPackageCard
                      key={pkg.id}
                      packageItem={pkg}
                      draft={drafts[pkg.id]}
                      groups={groups}
                      exchangeRate={exchangeRate}
                      isDirty={dirtyIds.includes(pkg.id)}
                      onUpdateDraft={(patch) => onUpdateDraft(pkg.id, patch)}
                      onDelete={() => onOpenDelete(pkg.id, drafts[pkg.id]?.name || pkg.name)}
                      deleteBlocked={deleteBlocked}
                      dragDisabled={dragDisabled}
                      onDragStart={(e) => onDragStart(pkg.id, e)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Packages if any */}
        {groupedPackages.unassigned.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-bold text-base text-amber-500 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Unassigned Packages
            </h3>
            <div className="space-y-3">
              {groupedPackages.unassigned.map((pkg) => (
                <SponsorPackageCard
                  key={pkg.id}
                  packageItem={pkg}
                  draft={drafts[pkg.id]}
                  groups={groups}
                  exchangeRate={exchangeRate}
                  isDirty={dirtyIds.includes(pkg.id)}
                  onUpdateDraft={(patch) => onUpdateDraft(pkg.id, patch)}
                  onDelete={() => onOpenDelete(pkg.id, drafts[pkg.id]?.name || pkg.name)}
                  deleteBlocked={deleteBlocked}
                  dragDisabled={dragDisabled}
                  onDragStart={(e) => onDragStart(pkg.id, e)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
