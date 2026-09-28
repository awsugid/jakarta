import { Package, Layers, Award, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatIDR } from "@/components/sponsor/communityDayConfig";
import type { SponsorPackage, SponsorPackageGroup, SponsorTier } from "@/lib/types";

interface SponsorAdminStatsProps {
  packages: SponsorPackage[];
  groups: SponsorPackageGroup[];
  tiers: SponsorTier[];
  exchangeRate: number;
}

export function SponsorAdminStats({
  packages,
  groups,
  tiers,
  exchangeRate,
}: SponsorAdminStatsProps) {
  const totalPackages = packages.length;
  const unlockedPackages = packages.filter((p) => p.isUnlocked).length;
  const totalPotentialRevenueIdr = packages.reduce((sum, p) => sum + p.priceIdr, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <Card className="bg-card/50 border-border/80">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Sponsor Packages</p>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {totalPackages}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({unlockedPackages} active)
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/80">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Package Groups</p>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {groups.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/80">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Sponsor Tiers</p>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {tiers.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/80">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">USD FX Rate</p>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {formatIDR(exchangeRate)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
