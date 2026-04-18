# Project Summary

## Purpose
Event management website for the AWS User Group Jakarta. Introduces community activities, upcoming meetups/Community Days, and facilitates collaboration with sponsors/partners. Mobile-first design is mandatory.

## Tech Stack (current, from package.json)
- **Framework**: Astro 6.1.4 (+ `@astrojs/react` 5.0.3, `@astrojs/mdx` 5.0.3, `@astrojs/check` 0.9.8)
- **Frontend Library**: React 19.2.3, React DOM 19.2.3
- **Styling**: Tailwind CSS v4.1.18 via `@tailwindcss/vite` 4.1.18, `@tailwindcss/typography` 0.5.19, `tw-animate-css` 1.4.0
- **UI Components**: shadcn/ui (components.json style: "default", base color: "slate"; repo CLAUDE.md mentions "new-york" historically — prefer what is in components.json: `default`/`slate`)
- **Radix primitives**: accordion, aspect-ratio, avatar, checkbox, dialog, dropdown-menu, label, select, separator, slot
- **Icons**: lucide-react 0.563.0
- **Charts**: recharts 2.15.4
- **Utils**: class-variance-authority, clsx, tailwind-merge
- **Fonts**: @fontsource/inter, Amazon Ember .woff2 in /public
- **Language**: TypeScript 5.9.3 (strict mode via `astro/tsconfigs/strict`)
- **Package Manager**: Bun (bun.lock present; package-lock.json also committed but Bun is the working PM)

## Deployment / Runtime
- **Output**: Static site (`dist/`) via `astro build`
- **Platform**: Cloudflare Pages (see `functions/api/subscribe.ts` which uses `PagesFunction<Env>`)
- **Serverless API**: Email subscriptions integrate with BillionMail (`mail.awscommunity.id`); endpoint lives at `functions/api/subscribe.ts` (Cloudflare Pages Functions), NOT in `src/pages/api`
- **Astro config**: `astro.config.mjs` registers `react()` and `mdx()` integrations; Vite uses tailwindcss plugin. Dev server allows host `astro.avei.ovh` and `localhost`.

## Node Version
Astro 6 requires Node >= 22.12.0. The local default `node` is v21 which fails. Use `nvm use 22` before running `bun run build` or `bunx astro check`.

## Directory Structure
```
.
├── astro.config.mjs
├── components.json               # shadcn/ui config (style=default, baseColor=slate)
├── tsconfig.json                 # extends astro/tsconfigs/strict; paths { @/*: src/* }
├── CLAUDE.md                     # Pre-existing guidelines (supplemented by AGENT.md)
├── AGENT.md                      # Unified agent instructions (created)
├── package.json                  # Bun scripts: dev, build, preview, astro
├── functions/api/subscribe.ts    # Cloudflare Pages Function (BillionMail proxy)
├── public/                       # Static assets: favicons, Amazon Ember fonts, /data/statistic.json
├── src/
│   ├── assets/
│   ├── content.config.ts         # Zod collections: events, blog (MDX)
│   ├── content/
│   │   ├── events/*.mdx
│   │   └── blog/*.mdx
│   ├── layouts/Layout.astro      # html.dark is hard-coded; injects GoogleAnalytics, Header, Footer
│   ├── lib/utils.ts              # `cn()` helper (clsx + tailwind-merge)
│   ├── styles/global.css         # Tailwind v4 @theme + OKLCH tokens, .dark variant
│   ├── pages/
│   │   ├── index.astro           # Hero + EventList + StatisticsCharts + CommunityStats
│   │   ├── events.astro
│   │   ├── events/[slug].astro-like structure via collections
│   │   ├── blog/
│   │   ├── speakers.astro        # SpeakerHero + SpeakerBenefits + SpeakerNotify
│   │   ├── volunteer.astro       # VolunteerHero + VolunteerRoles + VolunteerNotify
│   │   ├── sponsor.astro
│   │   ├── test-schedule.astro
│   │   └── api/                  # (empty — API handled by Cloudflare Pages Functions)
│   └── components/
│       ├── ui/                   # shadcn: accordion, avatar, badge, button, card, chart,
│       │                         #   checkbox, dropdown-menu, input, label, select,
│       │                         #   separator, sheet, table, textarea, aspect-ratio
│       ├── speakers/             # SpeakerHero, SpeakerBenefits, CFPForm (SpeakerNotify)
│       ├── volunteer/            # VolunteerHero, VolunteerRoles, VolunteerNotify
│       ├── sponsor/              # SponsorHero, SponsorBenefits, SponsorTiers, SponsorCTA
│       ├── blog/
│       ├── CommunityStats.tsx
│       ├── EventFAQ.tsx
│       ├── EventList.tsx
│       ├── Footer.astro / Header.astro / GoogleAnalytics.astro / MobileNav.tsx
│       ├── Hero.tsx
│       ├── PretixWidget.tsx
│       ├── ScheduleTable.tsx
│       ├── Sponsors.tsx
│       ├── StatisticsCharts.tsx
│       └── Welcome.astro
└── plans/                        # Feature plans / design docs (gitignored in workflow)
```

## Key Features / Modules
1. **Event pages** — powered by MDX content collection with Zod schema (title, date, location, type, pretix integration fields).
2. **Blog** — MDX content collection (title, pubDate, author, tags, image).
3. **Speaker page** — Talk formats are customizable per-entry via `isOpen: boolean` and `slotsNeeded: number` in `src/components/speakers/SpeakerBenefits.tsx`. Hero/CTA drive users to the email subscription list.
4. **Volunteer page** — Volunteer divisions in `src/components/volunteer/VolunteerRoles.tsx`. Hero/CTA drive users to the email subscription list.
5. **Subscription** — `POST /api/subscribe` (Cloudflare Pages Function in `functions/api/subscribe.ts`) proxies to BillionMail; types accepted: `speakers`, `volunteers`.
6. **Pretix widget** — Ticketing integration component.
7. **Schedule table / Statistics charts** — Data visualization (recharts) using `public/data/statistic.json`.

## Path Aliases (tsconfig)
- `@/*` → `src/*`
- Implied shadcn aliases from components.json: `@/components`, `@/lib/utils`

## Environment Variables (Cloudflare + local)
- `PUBLIC_GA_MEASUREMENT_ID`
- `BILLIONMAIL_API_URL` (default `https://mail.awscommunity.id`)
- `BILLIONMAIL_API_KEY`
- `BILLIONMAIL_SPEAKERS_GROUP_ID` (defaults to 2 in code)
- `BILLIONMAIL_VOLUNTEERS_GROUP_ID` (defaults to 1 in code)

## Recent Work (as of 2026-04-18)
- Removed "Applications/Registration Currently Closed" messaging from `/volunteer` and `/speaker` heroes.
- Updated copy to encourage joining subscription mailing lists.
- Made `/speaker` (SpeakerBenefits) talk formats customizable per-role with `isOpen` + `slotsNeeded` fields that render status badges.
