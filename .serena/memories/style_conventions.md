# Style and Conventions

## Language & Types
- TypeScript strict mode (extends `astro/tsconfigs/strict`).
- Prefer explicit types for public data shapes; leverage Zod schemas in `src/content.config.ts` for content collections.
- Never add imports you don't need; don't introduce libraries without checking `package.json`.

## Components
- React components (`.tsx`) for interactivity; Astro components (`.astro`) for pages, layouts, and static sections.
- Functional React components only. No class components.
- Feature folders under `src/components/<feature>/` (e.g. `speakers/`, `volunteer/`, `sponsor/`, `blog/`). Shared primitives live in `src/components/ui/` (shadcn).
- React components that live in `.astro` files MUST receive a client directive only when interactivity is required (`client:load`, `client:visible`, `client:idle`). Prefer `client:visible` for below-the-fold interactive sections.

## Styling
- Tailwind CSS v4; configuration is inline via `@theme` directive in `src/styles/global.css` (no `tailwind.config.*` file is used at runtime even though `components.json` references one).
- Color tokens are OKLCH and exposed as CSS variables (`--background`, `--foreground`, `--primary`, etc.); use token utilities like `bg-background`, `text-foreground`, `text-primary` — avoid raw hex.
- Dark mode is default via `<html class="dark">` in `src/layouts/Layout.astro`, enabled through the `@custom-variant dark (&:is(.dark *))` custom variant.
- Use `cn()` from `@/lib/utils` for combining Tailwind classes with variants; built on `clsx` + `tailwind-merge`.
- Animation utilities come from `tw-animate-css`; use `animate-in fade-in slide-in-from-bottom-5` etc. consistently with existing hero components.

## Mobile-First Design
- Required across all pages. Design at 360–414 px first, then add `sm:`, `md:`, `lg:`, `xl:` overrides.
- Hero components use clamped sizes like `text-4xl sm:text-5xl md:text-6xl lg:text-7xl`; mirror this pattern.

## shadcn/ui
- Config: `components.json` (`style: default`, `baseColor: slate`, `cssVariables: true`, `tsx: true`).
- Aliases: `@/components`, `@/lib/utils`.
- Add new components via `npx shadcn@latest add <name>` — they land in `src/components/ui/`.

## Accessibility & Semantics
- Use semantic HTML (`section`, `article`, `nav`, `main`) — mirrors layouts in existing pages.
- Icons from `lucide-react` must be decorative (wrapped in a labeled control) or paired with text.

## Naming
- React components: PascalCase files and exports.
- Astro pages: kebab-case filenames that match the URL route.
- Content files: kebab-case MDX filenames; slug derives from filename.

## Imports
- Use path aliases (`@/components/...`, `@/lib/utils`), never long relative chains.
- Group: third-party, then alias imports, then relative.

## Comments
- Keep code self-explanatory. Only add comments when they explain the "why" (e.g., the customization hints in `SpeakerBenefits.tsx` for `isOpen` / `slotsNeeded`).

## Git & Commits
- Always run `git status` + `git diff --cached` before committing.
- Never commit `.env` (gitignored) — BillionMail API key is sensitive.
