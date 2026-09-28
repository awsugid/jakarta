import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SponsorStatusBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  return isActive ? (
    <Badge
      variant="outline"
      className={cn(
        "text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        className
      )}
    >
      Active
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn("text-xs bg-muted text-muted-foreground border-border", className)}
    >
      Inactive
    </Badge>
  );
}
