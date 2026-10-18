import { Power, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface ConfiguratorStatusCardProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  saving: boolean;
  error: string | null;
  success: boolean;
}

export function ConfiguratorStatusCard({
  isEnabled,
  onToggle,
  saving,
  error,
  success,
}: ConfiguratorStatusCardProps) {
  return (
    <Card className="border-border/80 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
              <Power className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Public Sponsor Configurator Status
              </CardTitle>
              <CardDescription className="text-xs">
                Controls whether the interactive package configurator is visible and accepting inquiries on the public site.
              </CardDescription>
            </div>
          </div>

          <Badge
            variant={isEnabled ? "default" : "secondary"}
            className={
              isEnabled
                ? "bg-green-500/15 text-green-600 border border-green-500/30 dark:text-green-400 font-semibold"
                : "bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400 font-semibold"
            }
          >
            {isEnabled ? "● Open / Active" : "○ Closed / Hidden"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-background/50">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {isEnabled
                ? "Configurator is Currently Active"
                : "Configurator is Currently Closed"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isEnabled
                ? "Visitors can select sponsorship tiers, customize budgets, and generate inquiry proposals on /sponsor."
                : "The interactive configurator is hidden on /sponsor and replaced with an announcement banner explaining that applications are closed."}
            </p>
          </div>

          <Button
            type="button"
            variant={isEnabled ? "outline" : "default"}
            size="sm"
            disabled={saving}
            onClick={() => onToggle(!isEnabled)}
            className="shrink-0 font-semibold text-xs cursor-pointer gap-1.5 h-9"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </>
            ) : success ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Saved!
              </>
            ) : isEnabled ? (
              "Turn Off (Close Configurator)"
            ) : (
              "Turn On (Open Configurator)"
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
