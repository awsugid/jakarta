# Style and Conventions

## Code Style
- Use **TypeScript** with strict mode.
- Use **functional components** for React.
- Use **Astro components** (`.astro`) for pages and layouts.

## Styling
- Use **Tailwind CSS v4**.
- Config is in `src/styles/global.css` using `@theme` directive.
- Use `cn()` from `@/lib/utils` for class merging.
- Support Dark Mode via `.dark` class.

## Components
- **shadcn/ui**: Use components from `src/components/ui`.
- Import using aliases: `@/components/ui/...`.
- React components in Astro files need client directives (e.g., `client:load`) if interactive.
