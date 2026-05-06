import { cn } from "@/lib/utils";

interface ImmichKioskBackgroundProps {
  kioskUrl: string;
  albumId?: string;
  className?: string;
}

export function ImmichKioskBackground({
  kioskUrl,
  albumId,
  className,
}: ImmichKioskBackgroundProps) {
  const params = new URLSearchParams({
    disable_ui: "true",
    transition: "fade",
    theme: "fade",
    image_fit: "cover",
    duration: "8",
    background_blur: "true",
    show_videos: "false",
    frameless: "true",
  });

  if (albumId) {
    params.set("album", albumId);
  }

  const src = `${kioskUrl.replace(/\/$/, "")}?${params.toString()}`;

  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Community Photo Gallery"
        allow="autoplay"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
}
