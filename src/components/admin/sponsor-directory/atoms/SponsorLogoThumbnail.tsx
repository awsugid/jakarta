import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SponsorLogoThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SponsorLogoThumbnail({
  src,
  alt,
  className,
  size = "md",
}: SponsorLogoThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "w-10 h-10 p-1.5",
    md: "w-14 h-14 p-2",
    lg: "w-20 h-20 p-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        "rounded-lg bg-card/80 border border-border/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all",
        sizeClasses[size],
        className
      )}
    >
      {showFallback ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground/60 w-full h-full">
          <Building2 className={iconSizes[size]} />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
          loading="lazy"
        />
      )}
    </div>
  );
}
