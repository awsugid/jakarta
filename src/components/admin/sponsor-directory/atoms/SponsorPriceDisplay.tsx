import { cn } from "@/lib/utils";

interface SponsorPriceDisplayProps {
  price?: number | null;
  className?: string;
  showCurrency?: boolean;
}

export function formatRupiah(amount?: number | null): string {
  if (amount === undefined || amount === null || amount === 0) {
    return "In-kind / Custom";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SponsorPriceDisplay({
  price,
  className,
}: SponsorPriceDisplayProps) {
  const isCustomOrZero = !price || price <= 0;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "font-medium text-sm tabular-nums tracking-tight",
          isCustomOrZero
            ? "text-muted-foreground italic font-normal"
            : "text-foreground font-semibold"
        )}
      >
        {formatRupiah(price)}
      </span>
    </div>
  );
}
