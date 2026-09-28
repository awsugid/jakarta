import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SponsorPackage } from "@/lib/types";
import {
  DEFAULT_PLACEMENT_IMAGE,
  formatPackagePrice,
  getPlacementImageUrl,
  isSoldOut,
  maxSponsorsOf,
  minimumSpendOf,
  packagePriceParts,
  remainingSponsorSlots,
} from "@/components/sponsor/communityDayConfig";

interface SponsorPlacementModalProps {
  detailPackage: SponsorPackage | null;
  onClose: () => void;
  currency: "IDR" | "USD";
  exchangeRate: number;
  effectiveSelection: Record<string, boolean>;
  onToggleSelection: (id: string, checked: boolean) => void;
  total: number;
}

export function SponsorPlacementModal({
  detailPackage,
  onClose,
  currency,
  exchangeRate,
  effectiveSelection,
  onToggleSelection,
  total,
}: SponsorPlacementModalProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  useEffect(() => {
    if (detailPackage) {
      setImgSrc(detailPackage.imageUrl || getPlacementImageUrl(detailPackage.id));
      setImgFailed(false);
    }
  }, [detailPackage]);

  const handleImgError = () => {
    if (imgSrc !== DEFAULT_PLACEMENT_IMAGE) {
      setImgSrc(DEFAULT_PLACEMENT_IMAGE);
    } else {
      setImgFailed(true);
    }
  };

  return (
    <Dialog open={detailPackage !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {detailPackage && (
        <DialogContent className="max-w-2xl overflow-hidden p-0 bg-card border-border sm:rounded-2xl shadow-2xl">
          <div className="relative w-full aspect-video bg-muted/40 border-b border-border flex items-center justify-center overflow-hidden">
            {!imgFailed ? (
              <img
                src={imgSrc}
                alt={`${detailPackage.name} placement visual`}
                onError={handleImgError}
                className={cn(
                  "w-full h-full",
                  imgSrc === DEFAULT_PLACEMENT_IMAGE
                    ? "object-contain p-10 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900"
                    : "object-cover"
                )}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground bg-gradient-to-br from-muted/50 to-muted/20 w-full h-full">
                <ImageIcon className="h-10 w-10 text-primary/60" />
                <p className="text-xs font-medium text-foreground">Placement Visual Preview</p>
                <p className="text-[11px] text-muted-foreground">{detailPackage.name}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
            <Badge variant="secondary" className="absolute top-3 left-3 bg-background/80 backdrop-blur-md text-xs font-semibold">
              Ad Placement Visual Preview
            </Badge>
          </div>

          <div className="p-6 space-y-5">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {detailPackage.name}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-bold border-primary text-primary px-2.5 py-1">
                  {packagePriceParts(detailPackage, currency, exchangeRate).primary}
                </Badge>
              </div>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {detailPackage.advantage}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Pricing ({currency}):</span>
                <p className="font-semibold text-foreground text-sm">
                  {formatPackagePrice(detailPackage, currency, exchangeRate)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Slot Capacity:</span>
                <p className="font-semibold text-foreground">
                  {maxSponsorsOf(detailPackage) === null
                    ? "Unlimited Available"
                    : `${remainingSponsorSlots(detailPackage)} of ${maxSponsorsOf(detailPackage)} slots remaining`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                Close
              </Button>

              {(() => {
                const adminLocked = !detailPackage.isUnlocked;
                const soldOut = !adminLocked && isSoldOut(detailPackage);
                const minimumSpend = minimumSpendOf(detailPackage);
                const spendLocked = !adminLocked && !soldOut && minimumSpend !== null && total < minimumSpend;
                const locked = adminLocked || soldOut || spendLocked;
                const isChecked = locked ? false : !!effectiveSelection[detailPackage.id];

                return (
                  <Button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      onToggleSelection(detailPackage.id, !isChecked);
                      onClose();
                    }}
                    className={cn(
                      "cursor-pointer font-semibold min-w-[140px]",
                      isChecked
                        ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {isChecked ? "Remove from Request" : "Add to Package"}
                  </Button>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
