# UI/UX Proportionality & Fixed Header Layout Invariants

## Definition of UI/UX Proportionality

Proportionality in UI/UX engineering refers to visual balance, optical harmony, and consistent vertical rhythm across viewports.

1. **Top Padding Compensation for Fixed Headers**:
   - Header height is fixed at `h-16` (64px) to `h-20` (80px).
   - Top section containers must NEVER use small top padding (`py-12`, `py-16`), as the fixed header overlaps the first 64–80px of padding, leaving zero whitespace and causing headings/buttons to appear cramped or squished against the navbar.
   - **Hero / High-Impact Banners**: Require `min-h-[75vh]` to `min-h-[85vh]` with `pt-28 sm:pt-36 pb-16 md:pb-24 flex flex-col justify-center`.
   - **Index Pages (`/events`, `/blog`)**: Require `min-h-[40vh]` with `pt-28 sm:pt-36 pb-16 md:pb-24 flex items-center justify-center`.
   - **Detail Pages (`events/[slug]`, `blog/[slug]`)**: Require `pt-28 sm:pt-36 pb-12 md:pb-16`.
   - **Dashboard & Form Pages (`/profile`, `/orders`, `/applications`, `/admin`)**: Require `pt-24 sm:pt-32 pb-12 md:pb-16`.

2. **Aspect Ratio Invariants**:
   - Event and blog thumbnails MUST retain standard aspect ratios (`aspect-video` 16:9 or `aspect-[21/9]` banner) to avoid squished images or unnatural cropping.
   - Cards and container elements must maintain proportional padding (`p-6` to `p-8`) relative to font scaling.

3. **Golden Ratio Vertical Spacing**:
   - Spacing between section title, subtitle, and card grid must follow optical progression (e.g. `mb-4`, `mb-8`, `mb-12`).
