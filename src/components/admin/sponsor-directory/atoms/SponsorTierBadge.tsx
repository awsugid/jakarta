import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const STANDARD_TIERS = [
  { value: "venue", label: "Venue Partner", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "diamond", label: "Diamond Sponsor", badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { value: "platinum", label: "Platinum Sponsor", badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "gold", label: "Gold Sponsor", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "silver", label: "Silver Sponsor", badgeClass: "bg-slate-400/10 text-slate-300 border-slate-400/20" },
  { value: "bronze", label: "Bronze Sponsor", badgeClass: "bg-orange-700/10 text-orange-400 border-orange-700/20" },
  { value: "community", label: "Community Partner", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "media", label: "Media Partner", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { value: "supporter", label: "Community Supporter", badgeClass: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
];

export function getTierMeta(tierValue: string) {
  const found = STANDARD_TIERS.find((t) => t.value.toLowerCase() === tierValue.toLowerCase());
  if (found) return found;
  return {
    value: tierValue,
    label: tierValue.charAt(0).toUpperCase() + tierValue.slice(1),
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  };
}

export function SponsorTierBadge({ tier, className }: { tier: string; className?: string }) {
  const meta = getTierMeta(tier);
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  );
}
