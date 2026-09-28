import { Award, Plus, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SponsorTier, SponsorTierAccent } from "@/lib/types";
import type { TierDraft } from "../types";
import { formatIDR, formatUsdAmount } from "@/components/sponsor/communityDayConfig";
import { TierAccentBadge } from "../atoms/TierAccentBadge";

interface SponsorTiersTabProps {
  tiers: SponsorTier[];
  drafts: Record<string, TierDraft>;
  dirtyTierIds: string[];
  exchangeRate: number;
  onUpdateDraft: (id: string, patch: Partial<TierDraft>) => void;
  onOpenAddTier: () => void;
  onOpenDeleteTier: (id: string, name: string) => void;
  deleteBlocked: boolean;
}

const ACCENT_OPTIONS: { id: SponsorTierAccent; label: string }[] = [
  { id: "platinum", label: "Platinum (Silver-White)" },
  { id: "gold", label: "Gold (Amber)" },
  { id: "silver", label: "Silver (Zinc)" },
  { id: "bronze", label: "Bronze (Warm Orange)" },
  { id: "default", label: "Default (Primary Brand)" },
];

export function SponsorTiersTab({
  tiers,
  drafts,
  dirtyTierIds,
  exchangeRate,
  onUpdateDraft,
  onOpenAddTier,
  onOpenDeleteTier,
  deleteBlocked,
}: SponsorTiersTabProps) {
  // Ranked descending by threshold
  const sortedTiers = [...tiers].sort((a, b) => {
    const threshA = Number(drafts[a.id]?.threshold) || a.thresholdIdr;
    const threshB = Number(drafts[b.id]?.threshold) || b.thresholdIdr;
    return threshB - threshA;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/60 border border-border/80 p-4 rounded-2xl">
        <div className="space-y-0.5">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Sponsorship Tiers & Spend Thresholds
          </h3>
          <p className="text-xs text-muted-foreground">
            Tiers are awarded automatically based on total package spend. Highest matching threshold is assigned.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onOpenAddTier}
          className="font-semibold text-xs cursor-pointer gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Tier
        </Button>
      </div>

      <div className="space-y-3">
        {sortedTiers.map((tier, index) => {
          const draft = drafts[tier.id];
          if (!draft) return null;

          const isDirty = dirtyTierIds.includes(tier.id);
          const threshNum = Number(draft.threshold) || 0;
          const estimatedUsd = threshNum > 0 ? threshNum / exchangeRate : 0;
          const hasLabelError = !draft.label.trim();
          const hasThresholdError = !draft.threshold.trim() || isNaN(threshNum) || threshNum <= 0;

          return (
            <Card
              key={tier.id}
              className={cn(
                "border transition-all duration-200 bg-card overflow-hidden",
                isDirty ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "border-border/80"
              )}
            >
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-muted-foreground font-bold">
                      #{index + 1}
                    </span>
                    <TierAccentBadge
                      label={draft.label}
                      accent={draft.accent}
                    />
                    {isDirty && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        Edited
                      </Badge>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteBlocked}
                    onClick={() => onOpenDeleteTier(tier.id, draft.label)}
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer self-end sm:self-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Tier
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Tier Label</Label>
                    <Input
                      type="text"
                      maxLength={60}
                      value={draft.label}
                      onChange={(e) => onUpdateDraft(tier.id, { label: e.target.value })}
                      className="bg-background text-sm"
                    />
                    {hasLabelError && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Tier label is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Threshold (IDR) *
                    </Label>
                    <Input
                      type="number"
                      value={draft.threshold}
                      onChange={(e) => onUpdateDraft(tier.id, { threshold: e.target.value })}
                      className="bg-background font-mono text-sm"
                    />
                    {hasThresholdError ? (
                      <p className="text-[11px] text-destructive">Enter valid IDR threshold</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatIDR(threshNum)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Threshold (USD Override)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Optional USD override"
                      value={draft.thresholdUsd}
                      onChange={(e) => onUpdateDraft(tier.id, { thresholdUsd: e.target.value })}
                      className="bg-background font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {draft.thresholdUsd ? "Fixed manual USD threshold" : `~${formatUsdAmount(estimatedUsd)} (FX derived)`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-foreground">Accent Style:</Label>
                    <Select
                      value={draft.accent}
                      onValueChange={(val) => onUpdateDraft(tier.id, { accent: val as SponsorTierAccent })}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                        <SelectValue placeholder="Select accent color" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
