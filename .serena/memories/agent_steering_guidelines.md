# Agent Steering Guidelines

## Project Overview
AWS User Group Jakarta community website. Mobile-first platform for Indonesia's largest AWS community. Purposes: community building, event promotion (monthly meetups + yearly Community Days), sponsor collaboration, speaker/volunteer recruitment pipeline.

## Non-Negotiable Principles
1. **Mobile-First Design** — every new UI must be designed and tested at mobile widths first.
2. **TypeScript Strict Mode** — no implicit any, maintain types throughout.
3. **Astro Islands** — keep JS minimal; use React components only when interactivity is needed and hydrate with the least-eager directive that works (`client:visible` > `client:idle` > `client:load`).
4. **Content Collections** — MDX + Zod validation in `src/content.config.ts` is the source of truth for events and blog posts.
5. **shadcn/ui Patterns** — follow established component conventions; primitives under `@/components/ui`, feature folders elsewhere.
6. **Node 22** — Astro 6 requires Node >= 22.12; always `nvm use 22` before builds.

## Architecture Guidelines
- Static-first generation (Astro default static output); selectively hydrated islands.
- Cloudflare Pages Functions (`functions/api/*.ts`) for serverless endpoints — NOT Astro API routes. The BillionMail subscribe endpoint is the pattern to follow.
- Component composition over global state; keep forms local with `useState`.
- Type-safe content with MDX frontmatter validated by Zod.
- Responsive design driven by Tailwind v4 tokens defined in `src/styles/global.css`.
- Accessibility compliance (semantic HTML, labeled controls) in all new UI.

## Content Strategy
- **Blog**: Technical AWS content, best practices, case studies.
- **Events**: Monthly meetups, yearly Community Days, workshops, Re:Invent recaps.
- **Community focus**: Serverless, DynamoDB, Lambda, cloud architecture, community testimonials.
- **Sponsor integration**: Highlight partners; sponsor page has tiered benefits and CTA.
- **Speakers / Volunteers**: Currently subscription-driven; roles are customizable with `isOpen`/`slotsNeeded` flags rather than hard closures.

## Performance Standards
- Mobile-optimized loading times; no large bundles in `client:load` unless necessary.
- Optimize images (prefer static assets in `public/` or Astro Image).
- Progressive enhancement — pages must render useful HTML without JS (Astro SSR of islands handles this).

## Development Workflow
- Bun for dependency management and scripts.
- TypeScript strict mode with path aliases (`@/*`).
- shadcn/ui for consistent components (`style: default`, `baseColor: slate`).
- Astro dev server on localhost:4321 (via `bun dev`).
- Validate changes with `bun run build` under Node 22 before committing.
- Content validated through Zod schemas in `src/content.config.ts`.

## Known Pitfalls
- Default `node` on this machine is v21 → Astro 6 will refuse to build. Always run `nvm use 22` first.
- `functions/api/subscribe.ts` uses `PagesFunction<Env>` which is not typed globally; this produces TS errors under plain `tsc` — safe to ignore unless `@cloudflare/workers-types` is added.
- `components.json` references a `tailwind.config.mjs` that does not exist; Tailwind v4 inline config in `global.css` is authoritative.
- Never commit `.env` — it contains the BillionMail API key.
