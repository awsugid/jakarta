import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SponsorTierAccent } from "@/lib/types";
import { TIER_BADGE_CLASS } from "@/components/sponsor/communityDayConfig";

interface TierAccentBadgeProps {
  label: string;
  accent: SponsorTierAccent;
  className?: string;
}

export function TierAccentBadge({
  label,
  accent,
  className,
}: TierAccentBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-0.5 text-xs font-bold",
        TIER_BADGE_CLASS[accent] || TIER_BADGE_CLASS.default,
        className
      )}
    >
      {label || "Tier Badge"}
    </Badge>
  );
}
