# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an event management website for the AWS User Group Jakarta, built with Astro 5, React 19, and Tailwind CSS v4. The project uses shadcn/ui components (New York style) for the UI component library.

## Development Commands

All commands use Bun as the package manager:

```bash
bun install              # Install dependencies
bun dev                  # Start dev server at localhost:4321
bun build                # Build production site to ./dist/
bun preview              # Preview production build locally
bun astro ...            # Run Astro CLI commands
```

## Tech Stack

- **Framework**: Astro 5.16.5 (with React integration)
- **React**: v19.2.3 with TypeScript
- **Styling**: Tailwind CSS v4.1.18 (using @tailwindcss/vite)
- **UI Components**: shadcn/ui (New York style)
  - Using lucide-react for icons
  - class-variance-authority for component variants
  - tw-animate-css for animations
- **TypeScript**: Strict mode enabled (extends astro/tsconfigs/strict)

## Project Structure

```
src/
├── assets/          # Static assets (SVGs, images)
├── components/      # Astro and React components
│   └── ui/          # shadcn/ui components go here (via path alias @/components/ui)
├── layouts/         # Astro layout components
├── lib/             # Utility functions (accessible via @/lib alias)
│   └── utils.ts     # cn() utility for class merging
├── pages/           # File-based routing
└── styles/          # Global styles
    └── global.css   # Tailwind config with custom theme
```

## Configuration Details

### Path Aliases

The following TypeScript path aliases are configured:

- `@/*` → `src/*`
- `@/components` → `src/components`
- `@/components/ui` → `src/components/ui`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/utils` → `src/lib/utils`

### Tailwind CSS v4

This project uses Tailwind CSS v4 via the Vite plugin (`@tailwindcss/vite`). Key differences from v3:

- Configuration is in `src/styles/global.css` using `@theme` directive (not tailwind.config.js)
- Custom theme variables use CSS custom properties with OKLCH color space
- Dark mode implemented via `.dark` class using custom variant `@custom-variant dark (&:is(.dark *))`
- Uses `tw-animate-css` for animation utilities

### shadcn/ui Configuration

The project is configured for shadcn/ui components:

- Style: "new-york"
- CSS Variables: enabled
- Base color: "neutral"
- Components should be added via `npx shadcn@latest add <component>`
- Components are placed in `src/components/ui/`

### React in Astro

- React components can be used via the `@astrojs/react` integration
- Client directives (`client:load`, `client:idle`, etc.) control hydration
- React components use JSX with `react-jsx` transform
- TypeScript is configured for React with `jsxImportSource: "react"`

## Styling Approach

The project uses a comprehensive design system with CSS variables:

- Light and dark mode support via `.dark` class
- OKLCH color space for better perceptual uniformity
- Custom radius utilities (sm, md, lg, xl based on `--radius`)
- Predefined colors: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring
- Chart colors (chart-1 through chart-5)
- Sidebar-specific color tokens

Use the `cn()` utility function from `@/lib/utils` to merge Tailwind classes with shadcn/ui component variants.

## Important Notes

1. **Package Manager**: This project uses Bun, not npm or yarn
2. **Astro Pages**: Create new routes by adding `.astro` files to `src/pages/`
3. **React Hydration**: Add appropriate client directives to React components in `.astro` files
4. **Component Imports**: Use path aliases (`@/components/...`) rather than relative imports
5. **Styling**: All Tailwind configuration is in `src/styles/global.css`, not a separate config file
6. **TypeScript**: Strict mode is enabled; maintain type safety
