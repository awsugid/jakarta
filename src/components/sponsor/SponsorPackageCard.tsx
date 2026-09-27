import { useEffect, useState } from "react";
import { Award, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SponsorPackage } from "@/lib/types";
import {
  ASSET_ICONS,
  DEFAULT_PLACEMENT_IMAGE,
  formatIDR,
  formatPackagePrice,
  formatUsdAmount,
  getPlacementImageUrl,
  packagePriceParts,
} from "@/components/sponsor/communityDayConfig";

interface SponsorPackageCardProps {
  packageItem: SponsorPackage;
  currency: "IDR" | "USD";
  exchangeRate: number;
  isChecked: boolean;
  locked: boolean;
  adminLocked: boolean;
  soldOut: boolean;
  spendLocked: boolean;
  minimumSpend: number | null;
  maxSponsors: number | null;
  remaining: number | null;
  exceedsRemainingBudget: boolean;
  onToggleSelection: (id: string, checked: boolean) => void;
  onViewDetail: (pkg: SponsorPackage) => void;
}

export function SponsorPackageCard({
  packageItem: p,
  currency,
  exchangeRate,
  isChecked,
  locked,
  adminLocked,
  soldOut,
  spendLocked,
  minimumSpend,
  maxSponsors,
  remaining,
  exceedsRemainingBudget,
  onToggleSelection,
  onViewDetail,
}: SponsorPackageCardProps) {
  const Icon = ASSET_ICONS[p.id] || Award;
  const [imgSrc, setImgSrc] = useState(() => getPlacementImageUrl(p.id));
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgSrc(getPlacementImageUrl(p.id));
    setImgFailed(false);
  }, [p.id]);

  const handleImgError = () => {
    if (imgSrc !== DEFAULT_PLACEMENT_IMAGE) {
      setImgSrc(DEFAULT_PLACEMENT_IMAGE);
    } else {
      setImgFailed(true);
    }
  };

  return (
    <li>
      <Label
        htmlFor={p.id}
        className={cn(
          "relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 select-none overflow-hidden group",
          locked
            ? "cursor-not-allowed border-border bg-card/40 opacity-60"
            : "cursor-pointer hover:bg-accent/40",
          isChecked && "border-primary bg-primary/5 shadow-md shadow-primary/5"
        )}
      >
        {/* Background Placement Preview Image Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] dark:opacity-[0.12] overflow-hidden rounded-xl transition-opacity group-hover:opacity-15">
          {!imgFailed && (
            <img
              src={imgSrc}
              alt=""
              onError={handleImgError}
              className={cn(
                "w-full h-full object-right filter scale-105",
                imgSrc === DEFAULT_PLACEMENT_IMAGE
                  ? "object-contain p-3 opacity-60"
                  : "object-cover blur-[0.5px]"
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-transparent" />
        </div>

        <div className="flex items-center h-5 z-10">
          <Checkbox
            id={p.id}
            checked={isChecked}
            disabled={locked}
            onCheckedChange={(value) => onToggleSelection(p.id, value === true)}
            className={locked ? "cursor-not-allowed" : "cursor-pointer"}
          />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
          <div className="flex gap-3">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center transition-colors",
                isChecked
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/55 text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <div className="space-y-1 text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="block font-medium text-foreground leading-snug">
                    {p.name}
                  </span>
                  {adminLocked && (
                    <Badge variant="secondary" className="text-xs">
                      Not available
                    </Badge>
                  )}
                  {soldOut && (
                    <Badge variant="secondary" className="text-xs">
                      Sold out
                    </Badge>
                  )}
                  {!adminLocked && !soldOut && minimumSpend !== null && (
                    <Badge
                      variant={spendLocked ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {spendLocked
                        ? `Spend ${
                            currency === "USD"
                              ? `~${formatUsdAmount(minimumSpend / exchangeRate)} (est.)`
                              : formatIDR(minimumSpend)
                          } to unlock`
                        : `Unlock at ${
                            currency === "USD"
                              ? `~${formatUsdAmount(minimumSpend / exchangeRate)} (est.)`
                              : formatIDR(minimumSpend)
                          } spend`}
                    </Badge>
                  )}
                  {!adminLocked && !soldOut && remaining !== null && (
                    <Badge variant="outline" className="text-xs">
                      {`${remaining} of ${maxSponsors} slots left`}
                    </Badge>
                  )}
                  {exceedsRemainingBudget && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/40 text-amber-500"
                    >
                      Exceeds target budget
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground leading-relaxed">
                  {p.advantage}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDetail(p);
                  }}
                  className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground border-border/70 bg-background/60 hover:bg-background gap-1.5 cursor-pointer shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  View Placement
                </Button>

                {/* Price stacked below description on mobile only */}
                <span
                  className={cn(
                    "sm:hidden block text-xs font-semibold ml-auto",
                    isChecked ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatPackagePrice(p, currency, exchangeRate)}
                </span>
              </div>
            </div>
          </div>
          {/* Price aligned to right on desktop */}
          <div className="hidden sm:flex flex-col items-end whitespace-nowrap self-center shrink-0">
            <span
              className={cn(
                "text-sm font-semibold",
                isChecked ? "text-primary" : "text-muted-foreground"
              )}
            >
              {packagePriceParts(p, currency, exchangeRate).primary}
            </span>
            <span className="text-xs text-muted-foreground">
              {packagePriceParts(p, currency, exchangeRate).secondary}
            </span>
          </div>
        </div>
      </Label>
    </li>
  );
}
