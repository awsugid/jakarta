# Statistics Visualization Plan - ✅ COMPLETED

## Objective
Visualize the data from `public/data/statistic.json` in `index.astro` using shadcn/ui chart components built on Recharts.

## Implementation Status: ✅ COMPLETE

## Data Structure (from `public/data/statistic.json`)

```json
{
  "participantNumOfTheYear": [
    { "year": 2021, "total": 228 },
    { "year": 2022, "total": 401 },
    { "year": 2023, "total": 880 },
    { "year": 2024, "total": 551 },
    { "year": 2025, "total": 675 }
  ],
  "eventPerYear": [
    { "year": 2021, "total": 8 },
    { "year": 2022, "total": 10 },
    { "year": 2023, "total": 5 },
    { "year": 2024, "total": 4 },
    { "year": 2025, "total": 6 }
  ],
  "participantGenderDistributionLastYear": {
    "male": 87.9,
    "female": 12.1
  },
  "participantBackgroundDistribution": {
    "professional": 80.05,
    "student": 19.85
  }
}
```

## Implementation Steps

### Step 1: Install Dependencies
```bash
bun add recharts
npx shadcn@latest add chart
```

### Step 2: Create Statistics Charts Component
Create `src/components/StatisticsCharts.tsx` with:

#### 2.1 Bar Chart - Participants Per Year
- Uses `BarChart`, `Bar`, `XAxis`, `CartesianGrid` from Recharts
- Wrapped in `ChartContainer` from shadcn/ui
- Data: `participantNumOfTheYear`
- X-axis: year, Y-axis: total participants

#### 2.2 Bar Chart - Events Per Year
- Similar structure to participants chart
- Data: `eventPerYear`
- X-axis: year, Y-axis: total events

#### 2.3 Pie/Donut Chart - Gender Distribution
- Uses `PieChart`, `Pie`, `Cell` from Recharts
- Data: `participantGenderDistributionLastYear`
- innerRadius set for donut effect
- Two segments: Male (87.9%), Female (12.1%)

#### 2.4 Pie/Donut Chart - Background Distribution
- Similar to gender chart
- Data: `participantBackgroundDistribution`
- Two segments: Professional (80.05%), Student (19.85%)

### Step 3: Define Chart Configuration
```tsx
import { type ChartConfig } from "@/components/ui/chart"

const participantsConfig = {
  total: {
    label: "Participants",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const eventsConfig = {
  total: {
    label: "Events",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const genderConfig = {
  male: {
    label: "Male",
    color: "hsl(var(--chart-1))",
  },
  female: {
    label: "Female",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const backgroundConfig = {
  professional: {
    label: "Professional",
    color: "hsl(var(--chart-3))",
  },
  student: {
    label: "Student",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig
```

### Step 4: Component Props Interface
```tsx
interface StatisticsData {
  participantNumOfTheYear: { year: number; total: number }[];
  eventPerYear: { year: number; total: number }[];
  participantGenderDistributionLastYear: { male: number; female: number };
  participantBackgroundDistribution: { professional: number; student: number };
}

interface StatisticsChartsProps {
  data: StatisticsData;
}
```

### Step 5: Update index.astro
```astro
---
import Layout from "../layouts/Layout.astro";
import { Hero } from "../components/Hero";
import { EventList } from "../components/EventList";
import { CommunityStats } from "../components/CommunityStats";
import { StatisticsCharts } from "../components/StatisticsCharts";
import { getCollection } from "astro:content";
import statisticsData from "../../public/data/statistic.json";

const events = await getCollection("events");
const recentEvents = events
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 3);
---

<Layout title="AWS User Group Jakarta - Community Portal">
    <Hero client:load />
    <EventList client:visible events={recentEvents} />
    <StatisticsCharts client:visible data={statisticsData} />
    <CommunityStats client:visible />
</Layout>
```

### Step 6: Layout Design (Mobile-First)

#### Mobile Layout (< 768px)
- All 4 charts stacked vertically
- Full width charts
- Minimum height of 250px per chart

#### Desktop Layout (>= 768px)
- 2x2 grid layout
- Bar charts on top row
- Pie charts on bottom row

```tsx
<section className="py-16 bg-background">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">Community Growth</h2>
    <div className="grid gap-8 md:grid-cols-2">
      {/* Participants Bar Chart */}
      <Card>...</Card>
      {/* Events Bar Chart */}
      <Card>...</Card>
      {/* Gender Pie Chart */}
      <Card>...</Card>
      {/* Background Pie Chart */}
      <Card>...</Card>
    </div>
  </div>
</section>
```

## Chart Component Structure

```tsx
// src/components/StatisticsCharts.tsx
import React from 'react';
import { 
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig 
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
```

## Color Palette
Use shadcn/ui chart theme colors defined in `global.css`:
- `--chart-1` through `--chart-5`

## Accessibility
- Add `accessibilityLayer` prop to charts
- Include legends for all charts
- Use tooltips with `ChartTooltipContent`

## Files to Create/Modify
1. **Create**: `src/components/StatisticsCharts.tsx` ✅
2. **Create**: `src/components/ui/chart.tsx` (via shadcn CLI) ✅
3. **Modify**: `src/pages/index.astro` (add StatisticsCharts import and usage) ✅
4. **Modify**: `package.json` (recharts dependency added by bun) ✅

## Implementation Summary

### Dependencies Added
- `recharts@3.7.0` - For chart rendering
- shadcn/ui chart component - Via `npx shadcn@latest add chart`

### Files Created
- `src/components/StatisticsCharts.tsx` - React component with 4 charts:
  - Bar chart: Participants per year (Orange)
  - Bar chart: Events per year (Blue)
  - Donut chart: Gender distribution - 87.9% Male (Orange), 12.1% Female (Muted)
  - Donut chart: Background distribution - 80.05% Professional (Teal), 19.85% Student (Yellow)

### Files Modified
- `src/pages/index.astro`:
  - Added import for `StatisticsCharts` component
  - Imported statistics data from `public/data/statistic.json`
  - Integrated component with `client:load` directive positioned after EventList and before CommunityStats

### Design System Integration
- **Color Scheme**: Primary orange (`hsl(36 100% 50%)`), with accent colors (blue, teal, yellow)
- **Card Styling**: Semi-transparent backgrounds with backdrop blur (`bg-card/50 backdrop-blur-sm`)
- **Hover Effects**: Border and color transitions matching CommunityStats component
- **Typography**: Consistent with design system (font-bold, text-foreground, etc.)
- **Spacing**: 24px padding (py-24), proper container margins matching other sections

### Layout & Responsiveness
- Mobile-first responsive design
- Single column on mobile (<768px)
- 2x2 grid on desktop (>=768px)
- Cards with hover effects and transitions
- Section description for context

### Mobile Optimization
- **Pie Chart Labels**: Percentages displayed INSIDE the donut (centered in segments)
- **Legends**: Added below pie charts for clear labeling on small screens
- **Height**: Increased to 320px to accommodate legend
- **Positioning**: Chart positioned at cy="45%" to make room for legend

### Performance Optimization
- **Lazy Loading**: Changed from `client:load` to `client:visible` (only loads when scrolled into view)
- **Loading Skeleton**: Added animated pulse placeholders while charts render
- **Reduced Initial Bundle**: Charts don't block initial page load
- **Better UX**: Users see skeleton immediately, then charts render smoothly

### Build Status
✅ Build successful: `bun run build` completed without errors
✅ Dev server running: `bun dev` starts successfully at localhost:4321
✅ No TypeScript errors or diagnostics issues
✅ Design system colors properly applied
✅ Matches existing component styling (Hero, CommunityStats)
✅ Mobile-friendly pie charts with internal labels and legends
