# Agent Steering Guidelines

## Project Overview
AWS User Group Jakarta community website - mobile-first platform for Indonesia's largest AWS community. Focus on community building, event promotion, and sponsor collaboration.

## Key Development Principles
1. **Mobile-First Design**: All features must work excellently on mobile devices first
2. **TypeScript Strict Mode**: Maintain type safety throughout the codebase
3. **Astro Islands**: Use React components selectively for interactivity only
4. **Content Collections**: Leverage type-safe content management with Zod validation
5. **shadcn/ui Patterns**: Follow established design system conventions

## Architecture Guidelines
- Static-first generation with selective hydration
- Component composition over complex state management
- Type-safe content with MDX and frontmatter validation
- Responsive design with Tailwind CSS v4
- Accessibility compliance in all implementations

## Content Strategy
- Blog posts: Technical AWS content, best practices, case studies
- Events: Monthly meetups, yearly Community Days, workshops
- Community focus: Serverless, DynamoDB, Lambda, cloud architecture
- Sponsor integration: Highlight community partners and supporters

## Performance Standards
- Mobile-optimized loading times
- Minimal JavaScript bundle sizes
- Optimized image delivery
- Progressive enhancement patterns

## Development Workflow
- Bun for package management and development
- TypeScript strict mode with path aliases (@/*)
- shadcn/ui for consistent component library
- Astro dev server on localhost:4321
- Content validation through Zod schemas