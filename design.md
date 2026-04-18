# Design System — AWS User Group Jakarta

This document describes the visual language, tokens, and component patterns used across the AWS UG Jakarta website. It is the source of truth for new UI work and should be kept in sync with `src/styles/global.css` and the existing components in `src/components/`.

Treat this as a living spec: when a token or pattern changes in code, update this doc in the same PR.

---

## 1. Design Principles

1. **Mobile-first.** Every layout is designed at 360–414 px before `sm:`/`md:`/`lg:` enhancements.
2. **Dark by default.** The site ships with `<html class="dark">` hard-coded. Plan for dark surfaces first; light variants are a future concern (tokens are currently identical for `:root` and `.dark`).
3. **Community warmth with AWS-technical precision.** Orange primary (AWS cue) on a deep purple-tinted neutral background; generous spacing; confident typography.
4. **Progressive enhancement.** Most sections render server-side via Astro; React islands hydrate only when interactive (`client:visible` preferred).
5. **Accessible by default.** Semantic HTML, keyboard focus via `--ring`, lucide icons paired with text labels.
6. **Consistent rhythm.** Matching section padding, hero animation timings, radii, and shadow treatments across pages.

---

## 2. Color System

Tokens are defined in `src/styles/global.css` (`@layer base` + `@theme inline`) and consumed through Tailwind utilities (`bg-*`, `text-*`, `border-*`, etc.). Use tokens — never hard-coded colors — except for the documented orange shadows (`shadow-orange-500/20`) that complement the primary glow.

### 2.1 Core Palette (HSL unless noted)

| Token                     | Utility class            | Value                          | Typical use                                  |
| ------------------------- | ------------------------ | ------------------------------ | -------------------------------------------- |
| `--background`            | `bg-background`          | `#1B1827`                      | Page background, section fill                |
| `--foreground`            | `text-foreground`        | `hsl(210 40% 98%)`             | Primary text on dark                         |
| `--card`                  | `bg-card`                | `hsl(222 27% 22%)`             | Card surfaces                                |
| `--card-foreground`       | `text-card-foreground`   | `hsl(210 40% 98%)`             | Text on cards                                |
| `--popover`               | `bg-popover`             | `hsl(222 27% 19%)`             | Popover / dropdown                           |
| `--popover-foreground`    | `text-popover-foreground`| `hsl(210 40% 98%)`             | Text in popovers                             |
| `--primary`               | `bg-primary` / `text-primary` | `hsl(36 100% 50%)` (AWS orange) | Brand accents, CTAs, badges, headings highlight |
| `--primary-foreground`    | `text-primary-foreground`| `hsl(222 47.4% 11.2%)`         | Text on primary surfaces                     |
| `--secondary`             | `bg-secondary`           | `hsl(217.2 32.6% 17.5%)`       | Secondary surfaces, chips                    |
| `--secondary-foreground`  | `text-secondary-foreground` | `hsl(210 40% 98%)`          | Text on secondary                            |
| `--muted`                 | `bg-muted`               | `hsl(217.2 32.6% 17.5%)`       | Subtle section backgrounds (`bg-muted/30`)    |
| `--muted-foreground`      | `text-muted-foreground`  | `hsl(215 20.2% 65.1%)`         | Captions, body copy at lower emphasis        |
| `--accent`                | `bg-accent`              | `hsl(217.2 32.6% 17.5%)`       | Hover fills                                  |
| `--accent-foreground`     | `text-accent-foreground` | `hsl(210 40% 98%)`             | Text on accent                               |
| `--destructive`           | `bg-destructive`         | `hsl(0 62.8% 30.6%)`           | Destructive actions / errors                 |
| `--destructive-foreground`| `text-destructive-foreground` | `hsl(210 40% 98%)`         | Text on destructive                          |
| `--border`                | `border-border`          | `hsl(217.2 32.6% 17.5%)`       | Default borders                              |
| `--input`                 | `border-input`           | `hsl(217.2 32.6% 17.5%)`       | Input borders                                |
| `--ring`                  | `ring-ring`              | `hsl(36 100% 50%)`             | Focus ring (matches primary)                 |

### 2.2 Chart Palette

Used by `recharts` via the `--color-chart-*` tokens.

| Token        | Value                |
| ------------ | -------------------- |
| `--chart-1`  | `hsl(12 76% 61%)`    |
| `--chart-2`  | `hsl(173 58% 39%)`   |
| `--chart-3`  | `hsl(197 37% 24%)`   |
| `--chart-4`  | `hsl(43 74% 66%)`    |
| `--chart-5`  | `hsl(27 87% 67%)`    |

### 2.3 Sidebar Palette (OKLCH — shadcn's default set)

Kept for any future sidebar usage. Currently not rendered anywhere.

| Token                       | Value                        |
| --------------------------- | ---------------------------- |
| `--sidebar-primary`         | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)`        |
| `--sidebar-accent`          | `oklch(0.269 0 0)`           |
| `--sidebar-accent-foreground`  | `oklch(0.985 0 0)`        |
| `--sidebar-border`          | `oklch(1 0 0 / 10%)`         |
| `--sidebar-ring`            | `oklch(0.556 0 0)`           |

### 2.4 Semantic Color Usage

- **Status badges**: Green (`bg-green-500/10 text-green-600 border-green-500/20`) for "Open Now", outlined muted for "Closed". See `SpeakerBenefits.tsx`.
- **Ambient glows**: Hero sections layer three blurred blobs — `bg-primary/10`, `bg-secondary/10`, `bg-blue-500/10` — with large blur radii (80–100 px). Keep opacity ≤ 0.4.
- **Grid overlay**: `linear-gradient(...)` with 24 px spacing at `#80808012`, masked with a radial ellipse. Pattern must stay behind content (`-z-20`).

---

## 3. Typography

### 3.1 Fonts

- **Primary sans**: `Amazon Ember` (self-hosted `.woff2` in `/public`), with Regular (400), Medium (500), Bold (700), Medium Italic, Bold Italic.
- Fallback stack: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`.
- `@fontsource/inter` is installed but **not currently loaded**; do not introduce Inter in new components unless the font is imported.

### 3.2 Scale & Usage

| Element         | Classes                                                                                   | Notes                                             |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Hero H1         | `text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight`              | Highlight brand word with `<span class="text-primary">` |
| Section H2      | `text-3xl lg:text-4xl font-bold tracking-tight`                                           | Paired with a max-w-3xl lead paragraph            |
| Card title      | `text-xl font-bold tracking-tight`                                                        | Hover: `group-hover:text-primary`                 |
| Lead paragraph  | `text-lg sm:text-xl text-muted-foreground leading-relaxed`                                | Under hero H1                                     |
| Body            | `text-base text-muted-foreground leading-relaxed`                                         | Card descriptions, page copy                      |
| Small label     | `text-xs font-semibold uppercase tracking-wider text-muted-foreground/70`                 | Section captions ("Skills You'll Showcase", etc.) |
| Micro badge     | `text-xs text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md`                             | Inline tags/chips                                 |

### 3.3 Case & Tracking

- UPPERCASE labels use `tracking-wider` and `text-xs font-semibold`.
- Headlines use `tracking-tight`.
- Body copy keeps default tracking.

---

## 4. Spacing & Layout

- Base container: `container mx-auto px-4 md:px-6`.
- Hero vertical padding: `py-24 lg:py-32` (landing hero uses `lg:py-40`).
- Regular section: `py-24`; subtle variants may use `bg-muted/30`.
- Card grids: `grid gap-8 md:grid-cols-2 lg:grid-cols-3`.
- Button height: `h-12 px-8 text-base` for primary CTAs; default shadcn sizing otherwise.
- Max content widths: lead copy `max-w-2xl`, section intro `max-w-3xl mx-auto`.

### 4.1 Breakpoints (Tailwind defaults, mobile-first)

| Prefix | Min width |
| ------ | --------- |
| `sm:`  | 640 px    |
| `md:`  | 768 px    |
| `lg:`  | 1024 px   |
| `xl:`  | 1280 px   |
| `2xl:` | 1536 px   |

Design at mobile (360–414 px), then enhance in that order.

---

## 5. Radii, Borders, Shadows, Effects

| Token        | Value                  | Usage                       |
| ------------ | ---------------------- | --------------------------- |
| `--radius`   | `0.5rem`               | Base                        |
| `--radius-sm`| `calc(var(--radius) - 4px)` | Inputs, small badges   |
| `--radius-md`| `calc(var(--radius) - 2px)` | Buttons                |
| `--radius-lg`| `var(--radius)`        | Cards                       |
| `--radius-xl`| `calc(var(--radius) + 4px)` | Hero cards              |

- **Cards** (`Card` from shadcn): `border-border/50` + hover `hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all duration-300`.
- **Hero CTA buttons** use `shadow-lg shadow-orange-500/20` over the primary fill. This is the one place raw `orange-500` is acceptable because it intentionally extends the primary glow.
- **Glassmorphism badges**: `backdrop-blur-sm bg-background/50 border-muted-foreground/20`.
- **Subscription card** (`CFPForm`, `VolunteerNotify`): `rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-2xl` with a dotted radial background overlay at 20% opacity.

---

## 6. Motion

Powered by `tw-animate-css`. Heroes animate on mount:

```
animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out
```

Stagger pattern (delay adds 100 ms per tier): `delay-100`, `delay-200`, `delay-300` with `fill-mode-both`.

Other motion utilities:
- Live indicators: `animate-pulse` on dot badges (`h-2 w-2 rounded-full bg-primary`).
- Ambient glow loops: `animate-pulse duration-[5000ms]` on background blobs.
- Card hover: `transition-all duration-300 hover:-translate-y-1`.

Keep animation durations under 800 ms and avoid moving elements more than 20 px to respect reduced-motion preferences.

---

## 7. Iconography

- Library: `lucide-react` (tree-shaken imports only).
- Sizing: `h-4 w-4` inside buttons, `h-5 w-5` for text-adjacent, `h-6 w-6` for card headers, `h-10 w-10` for decorative confirmation states.
- Wrapped icons get `p-2.5 rounded-lg bg-primary/10 text-primary` with a hover transition to solid primary (see `SpeakerBenefits.tsx`).
- Pair icons with accessible text; decorative-only icons should have `aria-hidden="true"` applied by the parent.

---

## 8. Component Patterns

### 8.1 Hero Section (`Hero.tsx`, `SpeakerHero.tsx`, `VolunteerHero.tsx`)

- Pill badge with live dot → H1 with primary-highlighted word → lead paragraph → CTA group → three blurred background blobs → masked grid overlay.
- CTA pair: solid primary button + outline `bg-background/80 backdrop-blur-sm` button.
- Reuse the animation timing list above for new heroes.

### 8.2 Feature Cards (talk formats, volunteer divisions, sponsor tiers)

- `Card` with `group relative overflow-hidden`.
- Header holds: icon tile (left) + meta badge (right) + title + status row (optional).
- Body holds: description + "Key Responsibilities"/"Skills" tag cluster.
- Hover: translate-y + primary-tinted border + shadow.

### 8.3 Subscription CTA (`SpeakerNotify`, `VolunteerNotify`)

- Card spans full container, gradient + dotted radial overlay.
- Left: icon + small-caps label + H3 + supporting paragraph.
- Right: email input + primary button, or post-submit confirmation card (`bg-primary/10 border-primary/20`, `CheckCircle` icon, confirmation copy).
- Submits to `POST /api/subscribe` with `{ email, type: "speakers" | "volunteers" }`.

### 8.4 Badges

- Status: custom colors per state (green for open, muted outline for closed, primary outline for quantity). Follow the `SpeakerBenefits` mapping when adding new statuses.
- Metadata: `variant="secondary"` with `bg-secondary/80 text-xs`.
- Live indicator: `Badge variant="outline"` + pulsing dot.

### 8.5 Data Visualization

- `recharts` 2.15.4 via shadcn `chart` component.
- Use `--color-chart-1..5` tokens; never hard-code recharts colors.
- See `StatisticsCharts.tsx` for tooltip styling and responsive patterns.

---

## 9. Content Patterns

- Community tone: warm, confident, inclusive. Use inclusive verbs ("Join", "Share", "Build").
- CTAs are imperative and short ("Join Community", "Notify Me", "Submit Talk").
- Copy that previously announced closed applications has been replaced with "Subscribe for … Announcements". Do not reintroduce "Currently Closed" wording; per-role availability is communicated through `isOpen` / `slotsNeeded` flags.
- Event MDX frontmatter must satisfy `src/content.config.ts` schemas (events: title, date, location, type, description, optional pretix fields; blog: title, pubDate, description, author, optional image/tags).

---

## 10. Page-Level Rhythm

Recommended section order on landing-style pages:

1. **Hero** — 1 brand moment, 1 primary CTA, ambient background.
2. **Content grid** — cards (events, formats, divisions, tiers).
3. **Supporting content** — FAQ, statistics, testimonials.
4. **Conversion CTA** — subscription, sponsor inquiry, ticket link.

Each section: `py-24` vertical rhythm, alternate between `bg-background` and `bg-muted/30` to create depth without introducing new tokens.

---

## 11. Accessibility Checklist

- All interactive elements reach visible focus state via `focus-visible` ring (handled by shadcn primitives; do not remove).
- Color contrast: verify any new foreground/background combination with `muted-foreground` — it can drop below 4.5:1 on `bg-muted/30`. Prefer `text-foreground` for reading copy.
- Use semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`) — `Layout.astro` already does.
- Forms: `<label>` + `Input` from `@/components/ui/input`; confirm disabled states use `disabled:opacity-50` (shadcn default).
- Motion: keep critical information conveyed without relying on animation; do not animate text that needs to be read.

---

## 12. Adding a New Design Token

1. Declare the CSS variable in `:root` (and `.dark`) in `src/styles/global.css`.
2. Expose it via `@theme inline` (`--color-*`, `--radius-*`, etc.) so Tailwind can consume it.
3. Document it here (Section 2 or the relevant group).
4. Reference it from components with the generated utility class (e.g. `bg-surface-raised`) — never with raw `var(--surface-raised)` inside JSX.

---

## 13. Do / Don't Quick Reference

### Do
- Use `cn()` from `@/lib/utils` for merging class strings.
- Hydrate React islands with the least-eager directive (`client:visible` first).
- Honor `container mx-auto px-4 md:px-6` for page gutters.
- Pair primary-colored shadows with `shadow-orange-500/20` only on primary CTAs.

### Don't
- Don't introduce a second font without loading it in `global.css`.
- Don't hard-code hex colors except for the documented orange-500 shadow utility.
- Don't add light-mode-specific styles — the theme is dark-locked today.
- Don't bypass shadcn primitives for one-off buttons/inputs; extend them via `variant`/`className` instead.
- Don't add CLAUDE.md back as a separate file — it is a symlink to `AGENT.md`.
