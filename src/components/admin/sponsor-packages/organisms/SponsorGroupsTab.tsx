import { Layers, Plus, ArrowUp, ArrowDown, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SponsorPackageGroup, SponsorPackage } from "@/lib/types";
import type { GroupDraft } from "../types";

interface SponsorGroupsTabProps {
  groups: SponsorPackageGroup[];
  packages: SponsorPackage[];
  drafts: Record<string, GroupDraft>;
  dirtyGroupIds: string[];
  onUpdateDraft: (id: string, patch: Partial<GroupDraft>) => void;
  onMoveGroup: (id: string, dir: -1 | 1) => void;
  onOpenAddGroup: () => void;
  onOpenDeleteGroup: (id: string, name: string) => void;
  deleteBlocked: boolean;
}

export function SponsorGroupsTab({
  groups,
  packages,
  drafts,
  dirtyGroupIds,
  onUpdateDraft,
  onMoveGroup,
  onOpenAddGroup,
  onOpenDeleteGroup,
  deleteBlocked,
}: SponsorGroupsTabProps) {
  const sortedGroups = [...groups].sort(
    (a, b) => (drafts[a.id]?.displayOrder ?? a.displayOrder) - (drafts[b.id]?.displayOrder ?? b.displayOrder)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/60 border border-border/80 p-4 rounded-2xl">
        <div className="space-y-0.5">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Package Groups & Categorization
          </h3>
          <p className="text-xs text-muted-foreground">
            Reorder and configure the top-level section headers displayed in the sponsorship configurator.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onOpenAddGroup}
          className="font-semibold text-xs cursor-pointer gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>

      <div className="space-y-3">
        {sortedGroups.map((group, index) => {
          const draft = drafts[group.id];
          if (!draft) return null;

          const isDirty = dirtyGroupIds.includes(group.id);
          const pkgCount = packages.filter((p) => (p.groupId ?? "") === group.id).length;
          const isFirst = index === 0;
          const isLast = index === sortedGroups.length - 1;
          const hasLabelError = !draft.label.trim();

          return (
            <Card
              key={group.id}
              className={cn(
                "border transition-all duration-200 bg-card",
                isDirty ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "border-border/80"
              )}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isFirst}
                      onClick={() => onMoveGroup(group.id, -1)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                      #{draft.displayOrder}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isLast}
                      onClick={() => onMoveGroup(group.id, 1)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-foreground">Group Label</Label>
                      {isDirty && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Edited
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {pkgCount} {pkgCount === 1 ? "package" : "packages"}
                      </Badge>
                    </div>

                    <Input
                      type="text"
                      maxLength={80}
                      value={draft.label}
                      onChange={(e) => onUpdateDraft(group.id, { label: e.target.value })}
                      className="bg-background text-sm font-medium"
                    />
                    {hasLabelError && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Group label is required
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteBlocked}
                    onClick={() => onOpenDeleteGroup(group.id, draft.label)}
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
