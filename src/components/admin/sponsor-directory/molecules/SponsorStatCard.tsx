import { Card, CardContent } from "@/components/ui/card";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

interface SponsorStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ElementType;
  iconColor?: string;
  className?: string;
}

export function SponsorStatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: SponsorStatCardProps) {
  return (
    <Card className={cn("bg-card/50 border-border/60 shadow-sm relative overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl bg-muted/60 border border-border/40 shrink-0", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}
