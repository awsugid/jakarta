# Comday 26 - Shadcn Skeletons and Volunteer Cards Revision

## Overview
This memory logs the enhancements made to the AWS User Group Jakarta website (`jakarta-website`):
1. Implementation and refinement of Shadcn UI `Skeleton` component across all data-loading sections (`/links`, `/applications`, `/orders`, `/speakers`, and `/comday-26`).
2. High-fidelity SVG chart wireframes in `StatisticsCharts.tsx` for Line, Donut/Pie, Vertical Bar, and Horizontal Bar chart loading states.
3. Revision of Volunteer and Organizer cards in `PeopleList.tsx` according to user wireframe specifications.

## 1. High-Fidelity Chart Skeletons (`src/components/StatisticsCharts.tsx`)
- **Line Chart Skeleton (`type="line"`)**:
  - Curved bezier path (`d="M 10 70 Q 75 20, 150 45 T 290 15"`) with stroke gradient (`#line-stroke-gradient` from primary orange to orange-400).
  - Linear area gradient fill (`#line-area-gradient`) under the curve fading smoothly to transparent.
  - Animated pulsing dot nodes (`animate-ping`) with outer ring halos.
  - Subtle horizontal Cartesian grid lines (`stroke-border/40` dashed).
- **Donut / Pie Chart Skeleton (`type="pie"`)**:
  - SVG multi-segment Donut Chart wireframe with 55% primary orange arc, 30% teal arc, and 15% purple arc.
  - Centered `78%` statistic text placeholder inside the donut cutout hole.
  - Sleek legend pills below with color indicators and text skeletons.
- **Bar Skeletons (`type="bar"` & `type="horizontal-bar"`)**:
  - Gradient bar placeholders with shimmer light sweep animation (`animate-[shimmer_2s_infinite]`).

## 2. Volunteer & Organizer Card Redesign (`src/components/people/PeopleList.tsx`)
- **Card Wireframe Layout**:
  - Container: Centered flex column card (`flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/70 hover:border-primary/50 shadow-sm group`).
  - Avatar: Centered large circular avatar (`w-24 h-24 rounded-full border-2 border-primary/30 object-cover shadow-md mx-auto mb-4`).
  - Name Box: Full-width rounded pill box (`w-full py-2 px-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-bold text-sm sm:text-base truncate mb-2.5`).
  - Role Box: Full-width rounded pill box (`w-full py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold text-xs uppercase tracking-wider truncate mb-4`).
  - Social Row: `In` (LinkedIn) and `Github` (GitHub) action buttons.
- **Loading State**: Uses Shadcn `<Skeleton>` elements matching this exact wireframe layout.
- **Data Model**: Updated `PersonItem` interface with optional `linkedin` and `github` URL fields.
