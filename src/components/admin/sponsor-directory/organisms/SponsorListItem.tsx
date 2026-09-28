import type { EventSponsor } from "@/lib/types";
import { SponsorTierBadge } from "../atoms/SponsorTierBadge";
import { SponsorStatusBadge } from "../atoms/SponsorStatusBadge";
import { SponsorLogoThumbnail } from "../atoms/SponsorLogoThumbnail";
import { SponsorPriceDisplay } from "../atoms/SponsorPriceDisplay";
import { SponsorOrderControls } from "../molecules/SponsorOrderControls";
import { SponsorActionButtons } from "../molecules/SponsorActionButtons";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SponsorListItemProps {
  sponsor: EventSponsor;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabledControls?: boolean;
}

export function SponsorListItem({
  sponsor,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onEdit,
  onDelete,
  disabledControls = false,
}: SponsorListItemProps) {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-5 gap-4 transition-colors hover:bg-muted/30 border-b border-border/60 last:border-b-0",
        !sponsor.isActive && "opacity-70 bg-muted/10"
      )}
    >
      {/* Left: Order Controls + Logo Thumbnail + Details */}
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
        {/* Order Controls */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <SponsorOrderControls
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            isFirst={index === 0}
            isLast={index === totalCount - 1}
            disabled={disabledControls}
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            #{sponsor.displayOrder}
          </span>
        </div>

        {/* Thumbnail */}
        <SponsorLogoThumbnail
          src={sponsor.logoUrl}
          alt={sponsor.name}
          size="md"
          className="bg-white/95"
        />

        {/* Info Body */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">
              {sponsor.name}
            </h3>
            <SponsorTierBadge tier={sponsor.tier} />
            <SponsorStatusBadge isActive={sponsor.isActive} />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <SponsorPriceDisplay price={sponsor.priceIdr} />
            {sponsor.websiteUrl && (
              <a
                href={sponsor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Globe className="w-3 h-3" />
                <span className="truncate max-w-[200px]">
                  {sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
          </div>

          {sponsor.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5 max-w-2xl">
              {sponsor.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
        <SponsorActionButtons
          websiteUrl={sponsor.websiteUrl}
          isActive={sponsor.isActive}
          onToggleActive={onToggleActive}
          onEdit={onEdit}
          onDelete={onDelete}
          isUpdating={disabledControls}
        />
      </div>
    </div>
  );
}
