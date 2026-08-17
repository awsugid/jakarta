# Component Single Responsibility & Data Decoupling Guardrails

## 1. Single Responsibility Principle (SRP)
- Every component must have exactly 1 presentation/view responsibility.
- Never duplicate component rendering logic across multiple files (e.g. duplicating Accordion markup in `SpeakerFAQ.tsx`, `VolunteerFAQ.tsx`, and `EventFAQ.tsx`).
- Reusable UI elements must be consolidated into a single presenter component (e.g., `EventFAQ.tsx` handles all FAQ Accordion views). Page-specific FAQ components must wrap or pass data into `EventFAQ`.

## 2. Decouple Data from UI Components and Astro Pages
- **No Inline Data Arrays in Pages**: Never define large static data arrays (e.g. `customFaqs`, `scheduleItems`, `sampleVolunteers`) inside `.astro` page frontmatter. Page files in `src/pages/` should serve strictly as routing/layout orchestrators.
- **Dedicated Data Directory (`src/data/`)**: Store static data arrays, configuration constants, and fallback rosters in `src/data/` (e.g. `src/data/faqs.ts`, `src/data/volunteers.ts`, `src/data/volunteer-divisions.tsx`, `src/data/sponsors.ts`).
- **Clean Component Props**: Components should receive data arrays via props or default to exported constants from `src/data/`.

## 3. Modular & Reusable Architecture
- Utility functions belong in `src/lib/` (e.g. `src/lib/api.ts`, `src/lib/event-people.ts`, `src/lib/profiles-api.ts`).
- Type declarations belong in `src/lib/types.ts` or co-located data modules.
- Content schema definitions belong in `src/content.config.ts`.
