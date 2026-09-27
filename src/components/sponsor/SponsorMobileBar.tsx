import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SponsorTier } from "@/lib/types";
import { TIER_BADGE_CLASS } from "@/components/sponsor/communityDayConfig";

interface SponsorMobileBarProps {
  totalPrimaryText: string;
  tier: SponsorTier | null;
}

export function SponsorMobileBar({
  totalPrimaryText,
  tier,
}: SponsorMobileBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-t border-border p-4 shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="block text-xs text-muted-foreground uppercase font-bold tracking-wider">
            Package Request
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-lg font-bold tabular-nums text-foreground">
              {totalPrimaryText}
            </span>
            {tier && (
              <Badge
                className={cn(
                  "text-[10px] px-1.5 py-0 font-bold",
                  TIER_BADGE_CLASS[tier.accent]
                )}
              >
                {tier.label}
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            const element = document.getElementById("sponsorship-form-card");
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2 px-3 h-9 rounded-lg cursor-pointer"
        >
          Continue to Details
        </Button>
      </div>
    </div>
  );
}
