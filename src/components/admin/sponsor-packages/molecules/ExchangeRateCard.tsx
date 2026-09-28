import { useState, type FormEvent } from "react";
import { DollarSign, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatIDR } from "@/components/sponsor/communityDayConfig";

interface ExchangeRateCardProps {
  exchangeRate: number;
  onSaveRate: (rate: number) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
}

const COMMON_RATES = [16000, 16500, 17000, 17500];

export function ExchangeRateCard({
  exchangeRate,
  onSaveRate,
  saving,
  error,
  success,
}: ExchangeRateCardProps) {
  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = rateInput.trim();
    if (!/^\d+$/.test(val)) {
      setLocalError("Enter whole rupiah digits only.");
      return;
    }
    const num = Number(val);
    if (num < 1000 || num > 1000000) {
      setLocalError("Exchange rate must be between IDR 1,000 and IDR 1,000,000.");
      return;
    }
    setLocalError(null);
    await onSaveRate(num);
  };

  return (
    <Card className="border-border/80 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              USD / IDR Exchange Rate Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Global exchange rate used to convert package prices and sponsor tier thresholds when no USD override is specified.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                1 USD = IDR
              </span>
              <Input
                type="number"
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  setLocalError(null);
                }}
                className="pl-24 bg-background font-mono text-sm"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-9 px-4 font-semibold text-xs cursor-pointer gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Saved!
                </>
              ) : (
                "Update Exchange Rate"
              )}
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Quick Presets:</span>
            {COMMON_RATES.map((rate) => (
              <Button
                key={rate}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRateInput(String(rate));
                  setLocalError(null);
                }}
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {formatIDR(rate)}
              </Button>
            ))}
          </div>

          {(localError || error) && (
            <p className="text-xs text-destructive font-medium">
              {localError || error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
