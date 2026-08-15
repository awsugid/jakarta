import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

export const COMMUNITY_ALBUM_IDS = [
  "0c7e9c9e-d2f4-423f-a9d6-4b3caa8bb0a5", // Community Day 2025
  "00e664d7-50be-48f6-a536-52abc07b96da", // Kiro Night Bukber
  "311f43e9-53b9-4910-8688-5f173c8ca5e9", // Monthly Meetup April
  "5877f82e-d372-4c1e-bbe8-f0a98890f86d", // Monthly Meetup July
  "0db6836d-6049-48f0-88bb-703a6166dd3c", // Monthly Meetup June
  "7ec32a40-c929-4440-93f1-8ea473edd96a", // re:Invent Recap 2025
  "52dd8ab6-2f3c-4b19-860b-3f0a9891ef5f", // Voice AI Agents Workshop
];

interface ImmichKioskBackgroundProps {
  kioskUrl?: string;
  albumId?: string;
  randomizeAlbumOnVisit?: boolean;
  className?: string;
}

// Curated high-resolution preview images from all AWS Jakarta Community events
const FALLBACK_PREVIEW_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&auto=format&fit=crop",
    caption: "Community Day — Keynote Stage",
  },
  {
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop",
    caption: "AWS User Group — Monthly Meetup",
  },
  {
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    caption: "Hands-On Cloud & GenAI Workshop",
  },
  {
    url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1600&auto=format&fit=crop",
    caption: "AWS re:Invent Recap & Panel",
  },
  {
    url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1600&auto=format&fit=crop",
    caption: "Kiro Night & Community Builders",
  },
];

export function ImmichKioskBackground({
  kioskUrl,
  albumId,
  randomizeAlbumOnVisit = false,
  className,
}: ImmichKioskBackgroundProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | undefined>(albumId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (randomizeAlbumOnVisit || !albumId) {
      const randomIndex = Math.floor(Math.random() * COMMUNITY_ALBUM_IDS.length);
      setSelectedAlbumId(COMMUNITY_ALBUM_IDS[randomIndex]);
      setActiveImageIndex(Math.floor(Math.random() * FALLBACK_PREVIEW_IMAGES.length));
    } else {
      setSelectedAlbumId(albumId);
    }
  }, [albumId, randomizeAlbumOnVisit]);

  useEffect(() => {
    if (kioskUrl) return; // Immich iframe handles rotation internally

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % FALLBACK_PREVIEW_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [kioskUrl]);

  if (kioskUrl) {
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

    if (selectedAlbumId) {
      params.set("album", selectedAlbumId);
    }

    const src = `${kioskUrl.replace(/\/$/, "")}?${params.toString()}`;

    return (
      <div className={cn("absolute inset-0 z-0 overflow-hidden pointer-events-none", className)}>
        <iframe
          src={src}
          className="w-full h-full border-0 scale-105"
          title="Community Photo Gallery"
          allow="autoplay"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background backdrop-blur-[1.5px]" />
      </div>
    );
  }

  // Built-in aesthetic carousel
  return (
    <div className={cn("absolute inset-0 z-0 overflow-hidden select-none", className)}>
      {/* Photo Carousel Slide Backgrounds */}
      {FALLBACK_PREVIEW_IMAGES.map((img, idx) => (
        <div
          key={img.url}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center",
            idx === activeImageIndex ? "opacity-45 dark:opacity-35" : "opacity-0 pointer-events-none"
          )}
          style={{ backgroundImage: `url(${img.url})` }}
        />
      ))}

      {/* Aesthetic Vignette & Gradient Mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(10,8,20,0.7)_100%)] pointer-events-none" />

      {/* Floating Interactive Carousel Badge & Slide Indicator */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-card/80 border border-border/80 backdrop-blur-xl shadow-2xl text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Camera className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="hidden sm:inline font-semibold">{FALLBACK_PREVIEW_IMAGES[activeImageIndex].caption}</span>
          <span className="sm:hidden font-semibold">Community Highlights</span>
        </div>

        {/* Carousel Step Indicators */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
          {FALLBACK_PREVIEW_IMAGES.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => setActiveImageIndex(dotIdx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dotIdx === activeImageIndex ? "w-5 bg-orange-500" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground"
              )}
              aria-label={`Go to slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
