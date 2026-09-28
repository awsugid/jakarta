import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PLACEMENT_IMAGE } from "@/components/sponsor/communityDayConfig";

interface SponsorPlacementThumbnailProps {
  url: string;
  alt?: string;
  className?: string;
  showFallbackBadge?: boolean;
}

export function SponsorPlacementThumbnail({
  url,
  alt = "Placement visual",
  className,
  showFallbackBadge = true,
}: SponsorPlacementThumbnailProps) {
  const [imgSrc, setImgSrc] = useState(url);
  const [hasError, setHasError] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    setImgSrc(url);
    setHasError(false);
    setIsDefault(url === DEFAULT_PLACEMENT_IMAGE);
  }, [url]);

  const handleError = () => {
    if (imgSrc !== DEFAULT_PLACEMENT_IMAGE) {
      setImgSrc(DEFAULT_PLACEMENT_IMAGE);
      setIsDefault(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/80 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0",
        className || "w-24 h-16"
      )}
    >
      {!hasError ? (
        <img
          src={imgSrc}
          alt={alt}
          onError={handleError}
          className={cn(
            "w-full h-full",
            isDefault
              ? "object-contain p-2 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 opacity-80"
              : "object-cover"
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
          <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-[9px] mt-0.5">No image</span>
        </div>
      )}
      {showFallbackBadge && isDefault && !hasError && (
        <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-background/80 text-[8px] text-muted-foreground font-mono backdrop-blur-xs">
          Logo
        </div>
      )}
    </div>
  );
}
