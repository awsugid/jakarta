# AGENT.md

Unified guidance for any AI coding agent (Droid, Claude, Cursor, etc.) working in this repository. Keep responses concise, follow the existing conventions, and always validate changes before considering them done.

## 1. Project Overview

Event management and community portal for **AWS User Group Jakarta**. The site introduces community activities, promotes monthly meetups and yearly Community Days, and drives speaker/volunteer recruitment plus sponsor collaboration. Audience is primarily mobile, so **mobile-first** is non-negotiable.

## 2. Tech Stack (authoritative — check `package.json` before adding anything)

| Concern               | Tool / Version                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| Framework             | Astro `^6.1.4` (static output)                                                  |
| UI runtime            | React `^19.2.3` + `react-dom` (via `@astrojs/react`)                            |
| Content               | `@astrojs/mdx` + `astro:content` collections (Zod validated)                    |
| Styling               | Tailwind CSS v4 (`tailwindcss@^4.1.18` + `@tailwindcss/vite`) + `tw-animate-css`|
| Design system         | shadcn/ui (style `default`, baseColor `slate`) + Radix primitives               |
| Icons                 | `lucide-react`                                                                  |
| Charts                | `recharts@2.15.4`                                                               |
| Utils                 | `clsx`, `tailwind-merge`, `class-variance-authority`                            |
| Language              | TypeScript `^5.9.3`, strict mode (`astro/tsconfigs/strict`)                     |
| Package Manager       | **Bun** (canonical; `bun.lock` committed)                                       |
| Runtime (prod)        | Cloudflare Pages (static site + Pages Functions)                                |
| Email backend         | BillionMail (`mail.awscommunity.id`)                                            |
| Analytics             | Google Analytics via `PUBLIC_GA_MEASUREMENT_ID`                                 |

> Node.js **>= 22.12** is required by Astro 6. This machine's default `node` is v21, which will fail. Always `nvm use 22` before `bun run build` or `bunx astro check`.

## 3. Directory Layout

```
.
├── astro.config.mjs              # Astro integrations (react, mdx) + tailwind vite plugin
├── components.json               # shadcn/ui config (style: default, baseColor: slate)
├── tsconfig.json                 # extends astro/tsconfigs/strict; @/* -> src/*
├── CLAUDE.md                     # Legacy agent notes (retained for historical context)
├── AGENT.md                      # You are here
├── functions/
│   └── api/subscribe.ts          # Cloudflare Pages Function -> BillionMail
├── public/                       # Static assets (favicons, Amazon Ember fonts, data/*.json)
├── src/
│   ├── assets/
│   ├── content.config.ts         # Zod collections: events, blog (MDX)
│   ├── content/
│   │   ├── events/*.mdx
│   │   └── blog/*.mdx
│   ├── layouts/Layout.astro      # html.dark hard-coded; GA + Header/Footer
│   ├── lib/utils.ts              # cn() = clsx + tailwind-merge
│   ├── styles/global.css         # Tailwind v4 @theme, OKLCH tokens (dark-locked :root)
│   ├── pages/                    # File-based routes (index, events, blog, speakers, volunteer, sponsor, ...)
│   │   └── api/                  # Empty — API lives in /functions/api (Cloudflare)
│   └── components/
│       ├── ui/                   # shadcn primitives
│       ├── speakers/             # SpeakerHero, SpeakerBenefits, CFPForm (SpeakerNotify)
│       ├── volunteer/            # VolunteerHero, VolunteerRoles, VolunteerNotify
│       ├── sponsor/              # SponsorHero, SponsorBenefits, SponsorTiers, SponsorCTA
│       ├── blog/
│       ├── Hero.tsx, EventList.tsx, CommunityStats.tsx, StatisticsCharts.tsx, ScheduleTable.tsx, PretixWidget.tsx, MobileNav.tsx, Sponsors.tsx, Footer.astro, Header.astro, GoogleAnalytics.astro, Welcome.astro, EventFAQ.tsx
└── plans/                        # Design docs / internal plans (do not commit unless asked)
```

## 4. Commands

Always run from the project root.

```bash
# One-time per shell (needed because default node is v21)
nvm use 22

# Day-to-day
bun install
bun dev                 # http://localhost:4321
bun run build           # -> ./dist
bun preview
bun astro <...>         # Astro CLI passthrough

# Verification
bunx astro check        # Content + type checks (requires Node 22)
bunx tsc --noEmit       # TypeScript only (ignore pre-existing PagesFunction errors in functions/api/subscribe.ts)

# shadcn
npx shadcn@latest add <component>   # lands in src/components/ui/
```

## 5. Environment Variables

Copy `.env.example` → `.env`. `.env` is gitignored and **must never be committed**.

```
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
BILLIONMAIL_API_URL=https://mail.awscommunity.id
BILLIONMAIL_API_KEY=your_api_key_here
BILLIONMAIL_SPEAKERS_GROUP_ID=2
BILLIONMAIL_VOLUNTEERS_GROUP_ID=1
```

`BILLIONMAIL_API_KEY` is sensitive — treat it like a credential.

## 6. Coding Conventions

### TypeScript
- Strict mode is enabled. No implicit `any`, no silent `// @ts-ignore` without justification.
- Use explicit types for component props and data shapes. Zod schemas in `src/content.config.ts` are the source of truth for content.

### React / Astro
- Use **Astro components** (`.astro`) for layouts, pages, and static sections.
- Use **React components** (`.tsx`) only when interactivity is required.
- Functional components only. Keep state local with `useState`.
- Hydration directives in `.astro` files: prefer the least-eager that works — `client:visible` > `client:idle` > `client:load`.

### Styling
- Tailwind CSS v4 is configured inline in `src/styles/global.css` via `@theme`. There is **no** `tailwind.config.*` despite what `components.json` says.
- Use token classes (`bg-background`, `text-foreground`, `text-primary`, `border-border`, etc.). Avoid raw hex values.
- Dark mode is the only mode — `<html class="dark">` is hard-coded in `Layout.astro`. All tokens live in `:root`; no `.dark` override block exists.
- Combine classes with `cn()` from `@/lib/utils`.
- Animations: use `tw-animate-css` utilities (`animate-in fade-in slide-in-from-bottom-5 duration-700`). Match the cadence used in existing hero sections.

### Mobile-First
- Start at 360–414 px. Progressively enhance with `sm:`, `md:`, `lg:`, `xl:`.
- Existing heroes use `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` — mirror that rhythm.

### shadcn/ui
- `components.json` settings: `style: default`, `rsc: false`, `tsx: true`, `cssVariables: true`, `baseColor: slate`.
- Aliases: `@/components`, `@/lib/utils`.
- Add new components via `npx shadcn@latest add <name>`; they land in `src/components/ui/`.

### Naming & Imports
- PascalCase for React component files and exports.
- Kebab-case for Astro pages and MDX filenames (slug = filename).
- Always import via aliases (`@/components/...`, `@/lib/utils`) — never long `../../..` chains.
- Import order: third-party, `@/` alias imports, then relative.

### Comments
- Keep code self-explanatory. Only comment the **why**, not the **what**. Example of an acceptable comment: the customization hints at the top of `src/components/speakers/SpeakerBenefits.tsx` describing `isOpen` / `slotsNeeded`.

## 7. Feature Modules Cheat-Sheet

- **Events (`/events`)** — MDX in `src/content/events/`, validated by `content.config.ts` (fields: `title`, `date`, `location`, `type`, `description`, optional image/registration/pretix fields).
- **Blog (`/blog`)** — MDX in `src/content/blog/` (`title`, `pubDate`, `description`, `author`, optional `image`, `tags`).
- **Speakers (`/speakers`)** — `SpeakerBenefits.tsx` declares talk formats; each entry has `isOpen: boolean` and `slotsNeeded: number`. Toggle/edit those to change what shows on the page; no code elsewhere needs to change.
- **Volunteer (`/volunteer`)** — Divisions declared in `VolunteerRoles.tsx`. Subscription CTA in `VolunteerNotify.tsx`.
- **Sponsor (`/sponsor`)** — `SponsorHero`, `SponsorTiers`, `SponsorBenefits`, `SponsorCTA`.
- **Subscription (`POST /api/subscribe`)** — Cloudflare Pages Function at `functions/api/subscribe.ts`; proxies to BillionMail. Accepts `{ email, type }` where `type ∈ { "speakers", "volunteers" }`.
- **Pretix widget** — `src/components/PretixWidget.tsx` for ticketing.
- **Statistics / Schedule** — `StatisticsCharts.tsx`, `ScheduleTable.tsx` (recharts), fed by `public/data/statistic.json`.

## 8. Agent Workflow

Before completing any task:

1. Switch Node: `nvm use 22`.
2. Build once: `bun run build` — confirms static routes still generate.
3. (Optional) `bunx tsc --noEmit` — ignore pre-existing `PagesFunction` TS errors in `functions/api/subscribe.ts` unless you change that file.
4. Review `git status` + `git diff` and scan for secrets before committing.
5. Never push or commit without explicit user instruction.

When uncertain:
- Re-read this file and the feature-local components.
- Check `package.json` before introducing new libraries.
- Ask via a focused question rather than guessing API contracts.

## 9. Known Pitfalls

- Default `node` is v21 on this machine → Astro 6 refuses to build. Always `nvm use 22` first.
- `functions/api/subscribe.ts` uses `PagesFunction<Env>` which isn't typed globally. Pre-existing `tsc` errors exist for that file; ignore unless you add `@cloudflare/workers-types`.
- `components.json` still references `tailwind.config.mjs` that doesn't exist. Tailwind v4 inline config in `global.css` is authoritative.
- `bun.lock` and `package-lock.json` both exist. Bun is canonical; avoid running `npm install` which will overwrite the lockfile.
- Hero components already include a badge-style "Subscribe for …" CTA; do not reintroduce "Registration Closed" messaging. Role availability is communicated per-row via `isOpen` / `slotsNeeded`.
