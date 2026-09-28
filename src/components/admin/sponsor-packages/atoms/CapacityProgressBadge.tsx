import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CapacityProgressBadgeProps {
  maxSponsors: number | null;
  reservedSponsors: number;
}

export function CapacityProgressBadge({
  maxSponsors,
  reservedSponsors,
}: CapacityProgressBadgeProps) {
  if (maxSponsors === null) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/40 font-normal">
        Unlimited slots
      </Badge>
    );
  }

  const remaining = Math.max(0, maxSponsors - reservedSponsors);
  const isSoldOut = remaining === 0;
  const isNearLimit = remaining <= Math.max(1, Math.floor(maxSponsors * 0.3));

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        variant={isSoldOut ? "destructive" : isNearLimit ? "secondary" : "outline"}
        className={cn(
          "text-xs font-medium",
          isSoldOut && "bg-destructive/15 text-destructive border-destructive/30",
          !isSoldOut && isNearLimit && "bg-amber-500/15 text-amber-500 border-amber-500/30",
          !isSoldOut && !isNearLimit && "text-muted-foreground"
        )}
      >
        {isSoldOut
          ? "Sold Out"
          : `${remaining} of ${maxSponsors} slots left (${reservedSponsors} reserved)`}
      </Badge>
    </div>
  );
}
