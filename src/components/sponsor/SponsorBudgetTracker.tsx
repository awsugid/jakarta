import { Calculator, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatIDR, formatUsdAmount } from "@/components/sponsor/communityDayConfig";

interface SponsorBudgetTrackerProps {
  budgetPresets: number[];
  currency: "IDR" | "USD";
  budgetInput: string;
  setBudgetInput: (val: string) => void;
  targetBudget: number | null;
  isOverBudget: boolean;
  totalInCurrency: number;
  budgetRemaining: number | null;
  budgetProgress: number;
}

export function SponsorBudgetTracker({
  budgetPresets,
  currency,
  budgetInput,
  setBudgetInput,
  targetBudget,
  isOverBudget,
  totalInCurrency,
  budgetRemaining,
  budgetProgress,
}: SponsorBudgetTrackerProps) {
  return (
    <div className="mb-8 rounded-xl border border-border bg-card/60 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Sponsor Budget Tracker
            </h4>
            <p className="text-xs text-muted-foreground">
              Specify your target budget to track remaining funds and optimize package selection.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          {budgetPresets.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground mr-1">Presets:</span>
              {budgetPresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetInput(String(preset))}
                  className={cn(
                    "text-xs px-2.5 cursor-pointer",
                    budgetInput === String(preset) && "border-primary bg-primary/10 text-primary font-bold"
                  )}
                >
                  {currency === "USD"
                    ? `$${new Intl.NumberFormat("en-US").format(preset)}`
                    : `IDR ${new Intl.NumberFormat("en-US", { notation: "compact" }).format(preset)}`}
                </Button>
              ))}
            </>
          )}
          {budgetInput && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBudgetInput("")}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
            {currency === "USD" ? "$" : "IDR"}
          </span>
          <Input
            type="number"
            placeholder={currency === "USD" ? "Target Budget (USD)" : "Target Budget (IDR)"}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="pl-11 bg-background"
          />
        </div>

        {targetBudget !== null && (
          <div className="flex-1 flex flex-col justify-center space-y-1.5 bg-background border border-border/60 rounded-lg p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-muted-foreground">
                Target Budget: <strong className="text-foreground">{currency === "USD" ? formatUsdAmount(targetBudget) : formatIDR(targetBudget)}</strong>
              </span>
              <span>
                {isOverBudget ? (
                  <span className="text-destructive font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 inline shrink-0" />
                    Exceeds budget by {currency === "USD" ? formatUsdAmount(totalInCurrency - targetBudget) : formatIDR(totalInCurrency - targetBudget)}
                  </span>
                ) : (
                  <span className="text-emerald-500 font-medium">
                    Remaining: {currency === "USD" ? formatUsdAmount(budgetRemaining ?? 0) : formatIDR(budgetRemaining ?? 0)}
                  </span>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  isOverBudget ? "bg-destructive" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, budgetProgress)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
