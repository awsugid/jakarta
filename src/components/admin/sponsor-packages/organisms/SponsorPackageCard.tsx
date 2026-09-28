import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SponsorPackage, SponsorPackageGroup } from "@/lib/types";
import type { PackageDraft } from "../types";
import { formatIDR, formatUsdAmount } from "@/components/sponsor/communityDayConfig";
import { SponsorPlacementThumbnail } from "../atoms/SponsorPlacementThumbnail";
import { CapacityProgressBadge } from "../atoms/CapacityProgressBadge";
import { SponsorPlacementEditor } from "../molecules/SponsorPlacementEditor";

interface SponsorPackageCardProps {
  packageItem: SponsorPackage;
  draft: PackageDraft | undefined;
  groups: SponsorPackageGroup[];
  exchangeRate: number;
  isDirty: boolean;
  onUpdateDraft: (patch: Partial<PackageDraft>) => void;
  onDelete: () => void;
  deleteBlocked: boolean;
  dragDisabled: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function SponsorPackageCard({
  packageItem: p,
  draft,
  groups,
  exchangeRate,
  isDirty,
  onUpdateDraft,
  onDelete,
  deleteBlocked,
  dragDisabled,
  onDragStart,
  onDragEnd,
}: SponsorPackageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!draft) return null;

  const priceNum = Number(draft.price) || 0;
  const estimatedUsd = priceNum > 0 ? priceNum / exchangeRate : 0;
  const maxSponsorsNum = draft.maxSponsors.trim() ? Number(draft.maxSponsors) : null;
  const reservedSponsorsNum = Number(draft.reservedSponsors) || 0;
  const minSpendNum = draft.minSpend.trim() ? Number(draft.minSpend) : null;

  // Validation
  const hasNameError = !draft.name.trim();
  const hasAdvantageError = !draft.advantage.trim();
  const hasPriceError = !draft.price.trim() || isNaN(priceNum) || priceNum <= 0;
  const hasCapacityError =
    maxSponsorsNum !== null && reservedSponsorsNum > maxSponsorsNum;

  const currentImageUrl = draft.imageUrl;

  return (
    <div
      draggable={!dragDisabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border transition-all duration-200 bg-card overflow-hidden",
        isDirty ? "border-primary/50 shadow-md shadow-primary/5 ring-1 ring-primary/20" : "border-border/80 hover:border-border",
        !draft.isUnlocked && "opacity-80 bg-muted/20"
      )}
    >
      {/* Header / Summary Bar */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className={cn(
              "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 shrink-0",
              dragDisabled && "cursor-not-allowed opacity-40"
            )}
            title="Drag to reorder or reassign group"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <SponsorPlacementThumbnail
            url={currentImageUrl}
            alt={draft.name}
            className="w-12 h-12 shrink-0 rounded-lg cursor-pointer"
          />

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm sm:text-base leading-tight">
                {draft.name || "Untitled Package"}
              </span>
              {isDirty && (
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  Edited
                </Badge>
              )}
              {!draft.isUnlocked && (
                <Badge variant="secondary" className="text-[10px] bg-muted font-normal text-muted-foreground">
                  <Lock className="h-2.5 w-2.5 mr-0.5" />
                  Locked
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate max-w-md">
              {draft.advantage || "No benefit description provided."}
            </p>
          </div>
        </div>

        {/* Right Info: Price, Capacity & Quick Toggles */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
          <div className="text-left sm:text-right space-y-0.5">
            <div className="font-extrabold text-sm text-foreground">
              {priceNum > 0 ? formatIDR(priceNum) : "IDR —"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {draft.priceUsd ? (
                <span className="text-primary font-medium">
                  {formatUsdAmount(Number(draft.priceUsd))} (override)
                </span>
              ) : (
                <span>~{formatUsdAmount(estimatedUsd)} (est.)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <CapacityProgressBadge
              maxSponsors={maxSponsorsNum}
              reservedSponsors={reservedSponsorsNum}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              title={isExpanded ? "Collapse package details" : "Expand package editor"}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Editor Section */}
      {isExpanded && (
        <div className="border-t border-border/70 p-4 sm:p-5 bg-muted/20 space-y-5 animate-in slide-in-from-top-2 duration-200">
          {/* Main Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Package Name</Label>
              <Input
                type="text"
                value={draft.name}
                onChange={(e) => onUpdateDraft({ name: e.target.value })}
                className="bg-background text-sm"
                maxLength={80}
              />
              {hasNameError && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Name is required
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Group / Category</Label>
              <Select
                value={draft.groupId}
                onValueChange={(val) => onUpdateDraft({ groupId: val })}
              >
                <SelectTrigger className="bg-background text-sm">
                  <SelectValue placeholder="Select Group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Unlock / Public Availability</Label>
              <div className="flex items-center justify-between p-2 rounded-lg border border-border/80 bg-background h-10">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {draft.isUnlocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                      Available to Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      Locked / Hidden
                    </>
                  )}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isUnlocked}
                  onClick={() => onUpdateDraft({ isUnlocked: !draft.isUnlocked })}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    draft.isUnlocked ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out",
                      draft.isUnlocked ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Advantage / Benefit Description</Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {draft.advantage.length}/500
              </span>
            </div>
            <Textarea
              rows={2}
              maxLength={500}
              value={draft.advantage}
              onChange={(e) => onUpdateDraft({ advantage: e.target.value })}
              className="bg-background text-sm leading-relaxed"
            />
            {hasAdvantageError && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Benefit description is required
              </p>
            )}
          </div>

          {/* Pricing & Capacity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-border/60 bg-background">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Price (IDR) *</Label>
              <Input
                type="number"
                placeholder="2500000"
                value={draft.price}
                onChange={(e) => onUpdateDraft({ price: e.target.value })}
                className="font-mono text-sm bg-background"
              />
              {hasPriceError ? (
                <p className="text-[11px] text-destructive">Enter valid IDR price</p>
              ) : (
                <p className="text-[10px] text-muted-foreground font-mono">
                  {formatIDR(priceNum)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Price (USD Override)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Optional override"
                value={draft.priceUsd}
                onChange={(e) => onUpdateDraft({ priceUsd: e.target.value })}
                className="font-mono text-sm bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                {draft.priceUsd ? "Fixed manual USD price" : `~${formatUsdAmount(estimatedUsd)} (FX derived)`}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Min. Spend Gate (IDR)
              </Label>
              <Input
                type="number"
                placeholder="Optional spend gate"
                value={draft.minSpend}
                onChange={(e) => onUpdateDraft({ minSpend: e.target.value })}
                className="font-mono text-sm bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                {minSpendNum ? `Unlocks at ${formatIDR(minSpendNum)}` : "No minimum spend requirement"}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Capacity Limits</Label>
                <span className="text-[10px] text-muted-foreground">Max / Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Max slots"
                  value={draft.maxSponsors}
                  onChange={(e) => onUpdateDraft({ maxSponsors: e.target.value })}
                  className="font-mono text-xs bg-background"
                  title="Maximum sponsor slots (blank = unlimited)"
                />
                <span className="text-xs text-muted-foreground">/</span>
                <Input
                  type="number"
                  placeholder="Reserved"
                  value={draft.reservedSponsors}
                  onChange={(e) => onUpdateDraft({ reservedSponsors: e.target.value })}
                  className="font-mono text-xs bg-background"
                  title="Reserved/Confirmed sponsors count"
                />
              </div>
              {hasCapacityError && (
                <p className="text-[10px] text-destructive">Reserved cannot exceed Max</p>
              )}
            </div>
          </div>

          {/* Placement Visual Editor */}
          <SponsorPlacementEditor
            packageId={p.id}
            packageName={draft.name}
            imageUrl={draft.imageUrl}
            onChangeImageUrl={(url) => onUpdateDraft({ imageUrl: url })}
          />

          {/* Delete Action Bar */}
          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleteBlocked}
              onClick={onDelete}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Package
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
