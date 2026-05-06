import { cn } from "@/lib/utils";

interface ImmichKioskProps {
  kioskUrl: string;
  albumId: string;
  transition?: "none" | "fade" | "cross-fade";
  duration?: number;
  className?: string;
}

export function ImmichKiosk({
  kioskUrl,
  albumId,
  transition = "fade",
  duration = 8,
  className,
}: ImmichKioskProps) {
  const params = new URLSearchParams({
    album: albumId,
    disable_ui: "true",
    transition,
    theme: "fade",
    image_fit: "cover",
    duration: String(duration),
    background_blur: "true",
    show_videos: "false",
    frameless: "true",
  });

  const src = `${kioskUrl.replace(/\/$/, "")}?${params.toString()}`;

  return (
    <div
      className={cn(
        "relative w-full aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-black",
        className
      )}
    >
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full"
        title="Event Photo Gallery"
        allow="autoplay; fullscreen"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
