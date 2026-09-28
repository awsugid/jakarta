import { Building2, Eye, EyeOff, DollarSign } from "lucide-react";
import { SponsorStatCard } from "../molecules/SponsorStatCard";
import { formatRupiah } from "../atoms/SponsorPriceDisplay";

interface SponsorStatsOverviewProps {
  total: number;
  active: number;
  inactive: number;
  totalNominal: number;
}

export function SponsorStatsOverview({
  total,
  active,
  inactive,
  totalNominal,
}: SponsorStatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SponsorStatCard
        title="Total Sponsors"
        value={total}
        description="Configured in event directory"
        icon={Building2}
        iconColor="text-primary"
      />
      <SponsorStatCard
        title="Active on Site"
        value={active}
        description="Currently visible on public pages"
        icon={Eye}
        iconColor="text-emerald-400"
      />
      <SponsorStatCard
        title="Inactive"
        value={inactive}
        description="Hidden from public display"
        icon={EyeOff}
        iconColor="text-muted-foreground"
      />
      <SponsorStatCard
        title="Total Commitment"
        value={formatRupiah(totalNominal)}
        description="Total nominal sponsorship value"
        icon={DollarSign}
        iconColor="text-amber-400"
      />
    </div>
  );
}
