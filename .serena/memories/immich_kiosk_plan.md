# Immich Kiosk Embedding Plan

## Overview

Embed Immich Kiosk as a **live photo slideshow background** in the Hero sections across all pages. This replaces the current decorative blur circles ("Dynamic Background Elements") with real community event photos, making the hero feel alive and authentic. The approach uses the same pattern as the existing Hero component structure — an absolutely-positioned background layer with text overlaid on top.

**Key insight**: Every hero (`Hero.tsx`, `SpeakerHero.tsx`, `VolunteerHero.tsx`, `SponsorHero.tsx`, events heading) shares the same structure: `relative overflow-hidden` section → blur circles at `-z-10`/`-z-20` → content at `z-10`. We replace those blur circles with an Immich Kiosk iframe at `-z-10` + a dark overlay at `z-0`, keeping all hero text unchanged.

## Immich Kiosk Key Concepts (from docs)

- **Standalone Docker container** (`ghcr.io/damongolding/immich-kiosk:latest`) on port 3000
- Embeds via **iframe** — all config can be passed as **URL query parameters**
- Requires connection to an Immich server (`KIOSK_IMMICH_URL` + `KIOSK_IMMICH_API_KEY`)
- Key URL params for hero-background embedding:
  - `album=ALBUM_ID` — filter slideshow to a specific album
  - `disable_ui=true` — hide all UI overlays (clock, date, controls)
  - `transition=fade` — smooth transitions between photos
  - `theme=fade` — dark mode friendly
  - `image_fit=cover` — fill the container, cropping edges
  - `duration=8` — seconds per slide (faster than default 60s for web browsing)
  - `frameless=true` — strip all chrome/borders from the kiosk
  - `show_videos=false` — photos only
  - `background_blur=true` — kiosk's own blur behind images

---

## Architecture: Two Components

### 1. `src/components/ImmichKioskBackground.tsx` (NEW)

Full-bleed background slideshow for Hero sections. Renders an iframe absolutely positioned behind hero content with a semi-transparent dark overlay for text readability.

```tsx
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
      {/* Photo slideshow iframe */}
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Community Photo Gallery"
        allow="autoplay"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
}
```

**Design rationale:**
- `position: absolute inset-0 -z-10` — replaces the blur circles at the same z-level, behind content at `z-10`
- `bg-background/70` — semi-transparent dark overlay preserves text contrast while letting photos bleed through. This mirrors the existing `bg-background/50` used on Badge components
- `frameless=true` + `disable_ui=true` — pure photo slideshow, no chrome
- `image_fit=cover` — photos fill the hero area completely
- `albumId` optional — if omitted, kiosk shows random assets from Immich (general community photos)
- `duration=8` — fast enough for web browsing context (not a dedicated kiosk display)

### 2. `src/components/ImmichKiosk.tsx` (NEW)

Card-style embed for the event detail page gallery section. Same as the previous plan but retained for the `/events/[slug]` page where a contained gallery makes sense.

```tsx
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
```

---

## Files to Modify

### 3. `src/components/Hero.tsx` — Replace blur circles with kiosk background

Replace the three decorative blur divs + grid pattern with `<ImmichKioskBackground>` (conditional on `PUBLIC_IMMICH_KIOSK_URL` env var). If the env var is not set, fall back to the current blur circles.

**Before** (current):
```tsx
{/* Dynamic Background Elements */}
<div className="absolute top-1/2 left-1/2 ..." />
<div className="absolute top-0 right-0 ..." />
<div className="absolute bottom-0 left-0 ..." />
<div className="absolute inset-0 bg-[linear-gradient...]" />
```

**After**:
```tsx
{kioskUrl ? (
  <ImmichKioskBackground kioskUrl={kioskUrl} />
) : (
  <>
    <div className="absolute top-1/2 left-1/2 ..." />
    <div className="absolute top-0 right-0 ..." />
    <div className="absolute bottom-0 left-0 ..." />
    <div className="absolute inset-0 bg-[linear-gradient...]" />
  </>
)}
```

The component receives `kioskUrl` as a prop, passed from the page. Same pattern applies to `SpeakerHero.tsx`, `VolunteerHero.tsx`, `SponsorHero.tsx`.

### 4. `src/components/speakers/SpeakerHero.tsx` — Replace blur circles

Same swap as Hero.tsx — conditional kiosk background or fallback blur circles. Each hero can optionally pass a different `albumId` for page-specific photos.

### 5. `src/components/volunteer/VolunteerHero.tsx` — Replace blur circles

Same swap pattern.

### 6. `src/components/sponsor/SponsorHero.tsx` — Replace blur circles

Same swap pattern.

### 7. `src/content.config.ts` — Add `immichAlbumId` field

Add optional `immichAlbumId` to events schema for per-event gallery on the detail page:

```ts
// In the events schema, add after pretixListType:
immichAlbumId: z.string().optional(),
```

### 8. `src/pages/events/[...slug].astro` — Add gallery section (card embed)

Adds a "Event Gallery" section using the card-style `ImmichKiosk` component between event image and article content. Only renders if both env var and `immichAlbumId` frontmatter are present.

```astro
---
import { ImmichKiosk } from "@/components/ImmichKiosk";
const kioskUrl = import.meta.env.PUBLIC_IMMICH_KIOSK_URL;
---

{
  kioskUrl && event.data.immichAlbumId && (
    <div class="mb-12">
      <h2 class="text-2xl font-bold tracking-tight mb-6">Event Gallery</h2>
      <ImmichKiosk
        client:visible
        kioskUrl={kioskUrl}
        albumId={event.data.immichAlbumId}
      />
    </div>
  )
}
```

### 9. All pages with heroes — Pass `kioskUrl` from `import.meta.env`

Each page that renders a hero needs to read `PUBLIC_IMMICH_KIOSK_URL` and pass it to the hero component. Since these are `.astro` pages, the env var is available at build time:

```astro
---
const kioskUrl = import.meta.env.PUBLIC_IMMICH_KIOSK_URL;
---
<Hero client:load kioskUrl={kioskUrl} />
```

The hero components will receive `kioskUrl` as an optional prop. When undefined/not set, they render the current blur circles fallback — **zero visual regression**.

### 10. `.env.example` — Document new env var

Add:
```
# Immich Kiosk URL (e.g., https://kiosk.awscommunity.id). Leave empty to show decorative backgrounds instead of photo slideshow.
PUBLIC_IMMICH_KIOSK_URL=
```

---

## Visual Result

### With `PUBLIC_IMMICH_KIOSK_URL` set:
```
┌──────────────────────────────────────┐
│  ★ Community Photo Slideshow ★       │  ← Immich Kiosk iframe
│     (real event photos,              │     absolutely positioned
│      cycling every 8 seconds,        │     at z-index -10
│      fade transitions)               │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ bg-background/70 overlay    │    │  ← semi-transparent dark
│  │ (ensures text readability)   │    │     overlay at z-0
│  └──────────────────────────────┘    │
│                                      │
│     [Badge] Official AWS User Group  │  ← same hero text
│     AWS User Group Jakarta           │     unchanged at z-10
│     Join Indonesia's largest...      │
│     [Join Community] [See Events]    │
│                                      │
└──────────────────────────────────────┘
```

### Without `PUBLIC_IMMICH_KIOSK_URL` (fallback):
Exactly the same as current — decorative blur circles + grid pattern. Zero visual regression.

---

## Graceful Degradation

1. **No env var set** → Current blur circles render. Zero change.
2. **Kiosk server down/unreachable** → iframe shows blank/dark background (matches `bg-background/70` overlay) — no layout shift, no broken image icon visible to user.
3. **Slow connection** → `loading="lazy"` on iframe, hero text renders immediately over the overlay. Kiosk loads in background.
4. **Per-event album** → `immichAlbumId` is optional. Events without it simply don't show the card gallery section.

---

## Infrastructure Notes (not code changes)

1. **Deploy Immich Kiosk** as a Docker container:
   ```yaml
   services:
     immich-kiosk:
       image: ghcr.io/damongolding/immich-kiosk:latest
       container_name: immich-kiosk
       environment:
         KIOSK_IMMICH_URL: "https://your-immich-server.com"
         KIOSK_IMMICH_API_KEY: "your_api_key"
         KIOSK_PORT: "3000"
         KIOSK_BEHIND_PROXY: "true"
         KIOSK_DISABLE_URL_QUERIES: "false"  # allow URL params from embed
       ports:
         - "3000:3000"
       restart: always
   ```

2. **CORS / iframe embedding**: If behind a reverse proxy (Cloudflare, nginx), set `KIOSK_BEHIND_PROXY=true`. Ensure the kiosk server doesn't set `X-Frame-Options: DENY` — Immich Kiosk should allow iframe embedding by default.

3. **DNS**: Point a subdomain (e.g., `kiosk.awscommunity.id`) to the kiosk container.

4. **Cloudflare Pages**: No changes needed. The iframe loads an external URL at runtime; Astro builds statically as before.

---

## Verification Steps

1. `nvm use 22`
2. `bun run build` — confirm static routes still generate
3. `bunx astro check` — content + type checks pass (ignore pre-existing `PagesFunction` errors)
4. Set `PUBLIC_IMMICH_KIOSK_URL` to empty/unset → all pages render exactly as before
5. Set `PUBLIC_IMMICH_KIOSK_URL` to a running kiosk → hero backgrounds show photo slideshow
6. Test on mobile viewport (360–414px) — iframe scales correctly with `absolute inset-0`
7. Test `immichAlbumId` on an event → card gallery appears on event detail page