# AWS User Group Jakarta — New Community Pages (Volunteer, CFP/Speaker, Sponsorship)

## Objective

Create three new standalone pages for the AWS User Group Jakarta website:

1. **Volunteer Page** (`/volunteer`) — Explain volunteering opportunities, list divisions/roles with descriptions, and allow visitors to register their email for notifications when volunteer recruitment opens.
2. **Call for Speakers (CFP) Page** (`/speakers`) — Allow visitors to submit a speaker proposal for monthly events via a form following standard CFP guidelines (title, abstract, topic, level, duration, bio, etc.).
3. **Sponsorship Page** (`/sponsor`) — State that AWS UG Jakarta is always open for collaboration, explain collaboration possibilities (venue, food, swag, financial, etc.), and provide a contact/inquiry mechanism.

All pages must follow existing project conventions: Astro pages wrapping React components, shadcn/ui components, Tailwind CSS v4 with the existing dark theme, and the existing `Layout.astro` structure.

---

## Project Assessment

### Current Architecture

- **Framework**: Astro 5 + React 19, file-based routing in `src/pages/`
- **Styling**: Tailwind CSS v4 (config in `src/styles/global.css`), dark theme with primary color `hsl(36 100% 50%)` (AWS orange)
- **UI Library**: shadcn/ui (New York style) — currently has: Button, Card, Badge, Separator, Table, Avatar, Sheet, DropdownMenu, AspectRatio, Chart
- **Layout**: `src/layouts/Layout.astro` wraps all pages with Header + Footer
- **Navigation**: `src/lib/navigation.ts` defines `navItems` array consumed by Header and MobileNav
- **Component pattern**: Astro pages import React components and hydrate with `client:load` or `client:visible`
- **Existing pages**: `/` (index), `/events`, `/events/[slug]`, `/blog/[slug]`, `/blog/index`

### Key Patterns to Follow

- Pages use `Layout` with a `title` prop (e.g., `<Layout title="...">`)
- Hero/banner sections at top with heading + description in a `py-12 bg-muted/30` container
- React components use `@/components/ui/*` imports for shadcn components
- Icons from `lucide-react`
- Cards with `border-border/50` and hover effects (`hover:border-primary/20`, `hover:shadow-xl`)
- Background decorations: gradient blurs, radial patterns, grid overlays
- CTA sections use the glossy card pattern seen in `Sponsors.tsx` and `CommunityStats.tsx`

### Missing shadcn/ui Components to Install

The following shadcn/ui components are needed but not yet installed:
- **Input** — for text inputs in forms
- **Textarea** — for abstracts, descriptions
- **Label** — for form field labels
- **Select** — for dropdown selections (topic, audience level, duration)
- **Checkbox** — for terms/agreements
- **Dialog** — already installed (Radix dialog dependency exists)

---

## Implementation Plan

### Phase 1: Foundation — Navigation & UI Components

- [x] **Task 1.1: Update navigation items** in `src/lib/navigation.ts:1-7`
  - Add three new nav items: `{ name: 'Volunteer', href: '/volunteer' }`, `{ name: 'Speakers', href: '/speakers' }`, `{ name: 'Sponsors', href: '/sponsor' }`
  - Rationale: Navigation must be updated so visitors can discover the new pages from both desktop and mobile nav

- [x] **Task 1.2: Install shadcn/ui Input component**
  - Run `npx shadcn@latest add input` to add `src/components/ui/input.tsx`
  - Rationale: Required for email input on Volunteer page and text inputs on CFP form

- [x] **Task 1.3: Install shadcn/ui Textarea component**
  - Run `npx shadcn@latest add textarea` to add `src/components/ui/textarea.tsx`
  - Rationale: Required for abstract, bio, and description fields on the CFP form

- [x] **Task 1.4: Install shadcn/ui Label component**
  - Run `npx shadcn@latest add label` to add `src/components/ui/label.tsx`
  - Rationale: Required for accessible form field labels across all form pages

- [x] **Task 1.5: Install shadcn/ui Select component**
  - Run `npx shadcn@latest add select` to add `src/components/ui/select.tsx`
  - Rationale: Required for dropdown selections (topic category, audience level, talk duration) on the CFP form

- [x] **Task 1.6: Install shadcn/ui Checkbox component**
  - Run `npx shadcn@latest add checkbox` to add `src/components/ui/checkbox.tsx`
  - Rationale: Required for agreement checkboxes (code of conduct, terms) on forms

---

### Phase 2: Volunteer Page (`/volunteer`)

- [x] **Task 2.1: Create Volunteer page route** at `src/pages/volunteer.astro`
  - Use `Layout` with title "Volunteer — AWS User Group Jakarta"
  - Include a hero banner section matching the pattern in `src/pages/events.astro:10-21` (heading + description in `py-12 bg-muted/30`)
  - Import and render React components: `VolunteerHero`, `VolunteerRoles`, `VolunteerNotify`
  - Rationale: Follows existing page structure pattern

- [x] **Task 2.2: Create `VolunteerHero` React component** at `src/components/volunteer/VolunteerHero.tsx`
  - Full-width hero section with a compelling heading ("Volunteer with AWS User Group Jakarta")
  - Subtext explaining that volunteering is a great way to give back, build skills, and connect with the community
  - Status badge/indicator showing "Applications Currently Closed" with a subtle pulse animation
  - Background decorations matching the pattern in `src/components/Hero.tsx:51-57` (gradient blurs, grid overlay)
  - Rationale: Sets the tone and immediately communicates the current status

- [x] **Task 2.3: Create `VolunteerRoles` React component** at `src/components/volunteer/VolunteerRoles.tsx`
  - Section heading: "Volunteer Divisions & Roles"
  - Grid of cards (3 columns on desktop, 1 on mobile) for each division
  - Each card shows: division icon (from lucide-react), division name, role title(s), description of responsibilities, and a "Skills You'll Gain" mini-section
  - **Dummy divisions/roles to include**:
    1. **Event Operations** (icon: `CalendarCheck`) — On-site coordination, registration desk, AV setup, venue logistics. Roles: Event Coordinator, Registration Lead, AV Technician
    2. **Content & Speakers** (icon: `Mic`) — Speaker scouting, talk review, content calendar planning. Roles: Content Curator, Speaker Liaison
    3. **Social Media & Marketing** (icon: `Megaphone`) — Social media posts, event promotion, community engagement, graphic design. Roles: Social Media Manager, Graphic Designer
    4. **Technical & Web** (icon: `Code`) — Website maintenance, event platform setup, streaming/OBS, technical support. Roles: Web Developer, Stream Technician
    5. **Community Engagement** (icon: `Users`) — Member outreach, partner relations, feedback collection, community building. Roles: Community Manager, Partnership Coordinator
    6. **Photography & Documentation** (icon: `Camera`) — Event photography, video recording, content documentation. Roles: Photographer, Videographer
  - Card style: `border-border/50 hover:border-primary/20 hover:shadow-xl transition-all` matching existing card patterns
  - Rationale: Gives visitors a clear picture of what they could volunteer for, building anticipation

- [x] **Task 2.4: Create `VolunteerNotify` React component** at `src/components/volunteer/VolunteerNotify.tsx`
  - A CTA section with a glossy card matching the pattern in `src/components/Sponsors.tsx:27-53` or `src/components/CommunityStats.tsx:67-97`
  - Heading: "Get Notified When We're Hiring"
  - Description explaining that recruitment isn't open yet but they can register their email
  - Simple form with: email input (using shadcn Input) + "Notify Me" button (using shadcn Button)
  - Form state management with React `useState` — on submit, show a success message (e.g., "You're on the list! We'll email you when volunteer positions open.")
  - The form does NOT actually submit to a backend (no API yet) — just demonstrates the UI with client-side state
  - Rationale: Captures interest while recruitment is closed; provides immediate user feedback

---

### Phase 3: Call for Speakers / CFP Page (`/speakers`)

- [x] **Task 3.1: Create Speakers/CFP page route** at `src/pages/speakers.astro`
  - Use `Layout` with title "Call for Speakers — AWS User Group Jakarta"
  - Hero banner section with heading "Share Your Knowledge" and description about speaking at monthly meetups
  - Import and render React components: `SpeakerHero`, `SpeakerBenefits`, `CFPForm`
  - Rationale: Follows existing page structure; CFP pages are standard in tech communities

- [x] **Task 3.2: Create `SpeakerHero` React component** at `src/components/speakers/SpeakerHero.tsx`
  - Hero section with heading "Call for Speakers"
  - Subtext: "We're always looking for speakers to share their AWS knowledge at our monthly meetups. Whether you're a first-time speaker or a seasoned presenter, we'd love to hear from you."
  - Key stats/benefits in a horizontal row: "Monthly Meetups", "100-200 Attendees", "All Experience Levels Welcome"
  - Background decorations consistent with site theme
  - Rationale: Encourages speakers of all levels and sets expectations

- [x] **Task 3.3: Create `SpeakerBenefits` React component** at `src/components/speakers/SpeakerBenefits.tsx`
  - Section heading: "Why Speak at AWS UG Jakarta?"
  - Grid of benefit cards (2x3 or 3x2):
    1. **Build Your Personal Brand** (icon: `Award`) — Gain visibility in the AWS community
    2. **Expand Your Network** (icon: `Network`) — Connect with fellow AWS professionals
    3. **Give Back to Community** (icon: `Heart`) — Share knowledge and help others grow
    4. **Improve Speaking Skills** (icon: `Presentation`) — Practice in a supportive environment
    5. **Get Featured** (icon: `Star`) — Your talk will be promoted across our channels
    6. **AWS Recognition** (icon: `Cloud`) — Contribute to the official AWS community ecosystem
  - Card style consistent with existing patterns
  - Rationale: Addresses speaker motivation and reduces submission friction

- [x] **Task 3.4: Create `CFPForm` React component** at `src/components/speakers/CFPForm.tsx`
  - Section heading: "Submit Your Proposal"
  - Comprehensive form following standard CFP guidelines with these fields:
    1. **Full Name** (Input, required)
    2. **Email Address** (Input type=email, required)
    3. **Job Title / Role** (Input, required)
    4. **Company / Organization** (Input, optional)
    5. **Speaker Bio** (Textarea, required, min 50 chars — brief background about yourself)
    6. **Talk Title** (Input, required)
    7. **Talk Abstract** (Textarea, required, min 100 chars — detailed description of your talk)
    8. **Topic Category** (Select, required) — options: "Compute (EC2, Lambda, ECS)", "Storage & Database (S3, DynamoDB, RDS)", "Networking & Security (VPC, IAM, Shield)", "AI/ML (SageMaker, Bedrock, Rekognition)", "DevOps & IaC (CloudFormation, CDK, Terraform)", "Architecture & Design Patterns", "Cost Optimization", "Migration & Hybrid Cloud", "Other"
    9. **Audience Level** (Select, required) — options: "Beginner", "Intermediate", "Advanced", "All Levels"
    10. **Talk Duration** (Select, required) — options: "15 minutes (Lightning Talk)", "30 minutes (Standard Talk)", "45 minutes (Deep Dive)", "60 minutes (Workshop)"
    11. **Previous Speaking Experience** (Textarea, optional — links to past talks, conferences, meetups)
    12. **Additional Notes** (Textarea, optional — anything else the organizers should know)
    13. **Code of Conduct Agreement** (Checkbox, required — "I agree to abide by the AWS User Group Jakarta Code of Conduct")
  - Form layout: two-column grid for short fields (name/email, job title/company), full-width for textareas
  - Client-side validation using React state
  - Submit button with loading state
  - Success state: show a confirmation card/message after submission (e.g., "Thank you! Your proposal has been submitted. We'll review it and get back to you within 2 weeks.")
  - No actual backend submission — client-side state only for now
  - Rationale: Standard CFP form captures all necessary information for organizers to evaluate proposals

---

### Phase 4: Sponsorship Page (`/sponsor`)

- [x] **Task 4.1: Create Sponsorship page route** at `src/pages/sponsor.astro`
  - Use `Layout` with title "Sponsorship & Collaboration — AWS User Group Jakarta"
  - Hero banner section with heading "Partner with AWS User Group Jakarta"
  - Import and render React components: `SponsorHero`, `SponsorTiers`, `SponsorBenefits`, `SponsorCTA`
  - Rationale: Dedicated sponsorship page allows deeper engagement with potential sponsors

- [x] **Task 4.2: Create `SponsorHero` React component** at `src/components/sponsor/SponsorHero.tsx`
  - Hero section with heading "Collaborate with Us"
  - Subtext: "AWS User Group Jakarta is always open for collaboration. Whether you're a company looking to reach cloud professionals or an individual wanting to contribute, there are many ways to partner with us."
  - Key metrics: "4,000+ Members", "50+ Events", "Monthly Meetups"
  - Background decorations consistent with site theme
  - Rationale: Opens the door to all types of collaboration, not just financial sponsorship

- [x] **Task 4.3: Create `SponsorTiers` React component** at `src/components/sponsor/SponsorTiers.tsx`
  - Section heading: "Collaboration Opportunities"
  - Grid of cards explaining different ways to collaborate:
    1. **Venue Sponsor** (icon: `Building`) — Provide a venue for our monthly meetups (capacity 100-200, with projector/screen, WiFi). Your logo displayed at the event and on our website.
    2. **Food & Beverage Sponsor** (icon: `Coffee`) — Sponsor food and drinks for attendees during networking sessions. Great brand visibility during the most social part of the event.
    3. **Swag & Merchandise Sponsor** (icon: `Gift`) — Provide branded merchandise, stickers, t-shirts, or other items for attendees. Your brand travels with our community members.
    4. **Financial Sponsor** (icon: `Wallet`) — Direct financial support for event operations, infrastructure, and community growth. Includes premium logo placement and dedicated shoutouts.
    5. **Content & Speaker Sponsor** (icon: `Mic2`) — Provide expert speakers for our events or co-host specialized workshops. Position your company as a thought leader in the AWS ecosystem.
    6. **Media & Promotion Partner** (icon: `Share2`) — Help amplify our events through your channels. Cross-promotion benefits for both communities.
  - Each card: icon, title, description, and a subtle "Popular" or "Recommended" badge on select tiers
  - Card style consistent with existing patterns
  - Rationale: Shows the breadth of collaboration options, making it approachable for organizations of all sizes

- [x] **Task 4.4: Create `SponsorBenefits` React component** at `src/components/sponsor/SponsorBenefits.tsx`
  - Section heading: "Why Partner with AWS UG Jakarta?"
  - Horizontal or grid layout of key benefits:
    1. **Direct Access to Cloud Professionals** — Reach 4,000+ active AWS practitioners
    2. **Brand Visibility** — Logo placement on website, events, social media, and merchandise
    3. **Talent Pipeline** — Connect with skilled developers, architects, and engineers
    4. **Community Goodwill** — Demonstrate commitment to the local tech ecosystem
    5. **Content Co-Creation** — Collaborate on workshops, blog posts, and technical content
    6. **AWS Ecosystem Connection** — Be part of the official AWS User Group network in Southeast Asia
  - Use a clean layout with icons and short descriptions
  - Rationale: Answers the "what's in it for me" question for potential sponsors

- [x] **Task 4.5: Create `SponsorCTA` React component** at `src/components/sponsor/SponsorCTA.tsx`
  - Glossy CTA card matching the pattern in `src/components/Sponsors.tsx:27-53`
  - Heading: "Let's Build Something Great Together"
  - Description: "Ready to collaborate? Reach out to our organizing team and let's discuss how we can create mutual value."
  - Two action buttons:
    1. "Email Us" (primary button) — links to `mailto:organizers@awsugjakarta.id`
    2. "Download Sponsorship Deck" (outline button) — links to a placeholder `#` (no actual PDF yet)
  - Background decorations: radial gradient pattern, glossy blur overlay
  - Rationale: Provides clear next steps for interested sponsors

---

### Phase 5: Integration & Polish

- [x] **Task 5.1: Verify all three pages render correctly**
  - Start dev server with `bun dev` and navigate to `/volunteer`, `/speakers`, `/sponsor`
  - Verify each page loads without errors, has correct title, and all components render
  - Rationale: Catch integration issues early

- [x] **Task 5.2: Verify mobile responsiveness**
  - Test all three pages at mobile, tablet, and desktop breakpoints
  - Verify navigation shows new items correctly in both desktop and mobile nav
  - Verify forms are usable on mobile (proper input sizing, no horizontal scroll)
  - Rationale: Significant portion of traffic comes from mobile devices

- [x] **Task 5.3: Verify consistent design language**
  - All pages use the same card styles, spacing patterns, background decorations, and color tokens
  - Headings, body text, and muted text follow the same typographic hierarchy
  - Interactive elements (buttons, inputs) have consistent hover/focus states
  - Rationale: Professional appearance requires visual consistency across all pages

---

## File Structure Summary

```
src/
├── pages/
│   ├── volunteer.astro          # NEW — Volunteer page route
│   ├── speakers.astro           # NEW — CFP/Speakers page route
│   └── sponsor.astro            # NEW — Sponsorship page route
├── components/
│   ├── volunteer/
│   │   ├── VolunteerHero.tsx    # NEW — Hero section with status
│   │   ├── VolunteerRoles.tsx   # NEW — Division/role cards
│   │   └── VolunteerNotify.tsx  # NEW — Email notification signup
│   ├── speakers/
│   │   ├── SpeakerHero.tsx      # NEW — Hero section with stats
│   │   ├── SpeakerBenefits.tsx  # NEW — Why speak benefits grid
│   │   └── CFPForm.tsx          # NEW — CFP submission form
│   ├── sponsor/
│   │   ├── SponsorHero.tsx      # NEW — Hero section with metrics
│   │   ├── SponsorTiers.tsx     # NEW — Collaboration options grid
│   │   ├── SponsorBenefits.tsx  # NEW — Partner benefits
│   │   └── SponsorCTA.tsx       # NEW — Contact CTA section
│   └── ui/
│       ├── input.tsx            # NEW — shadcn/ui Input
│       ├── textarea.tsx         # NEW — shadcn/ui Textarea
│       ├── label.tsx            # NEW — shadcn/ui Label
│       ├── select.tsx           # NEW — shadcn/ui Select
│       └── checkbox.tsx         # NEW — shadcn/ui Checkbox
├── lib/
│   └── navigation.ts           # MODIFY — Add 3 new nav items
└── layouts/
    └── Layout.astro            # NO CHANGE — Reused as-is
```

**Total new files**: 13 (3 page routes + 10 React components)
**Total modified files**: 1 (`navigation.ts`)
**New shadcn/ui components to install**: 5 (Input, Textarea, Label, Select, Checkbox)

---

## Verification Criteria

- [ ] All three pages (`/volunteer`, `/speakers`, `/sponsor`) render without console errors
- [ ] Navigation bar (desktop and mobile) shows all new page links and they navigate correctly
- [ ] Volunteer page displays 6 division cards with role descriptions and has a working email notification form
- [ ] CFP form has all 13 fields, validates required fields, and shows success state on submit
- [ ] Sponsorship page displays 6 collaboration tier cards, 6 benefit items, and has a working CTA section
- [ ] All pages are fully responsive (mobile, tablet, desktop)
- [ ] Design language is consistent with existing pages (colors, card styles, spacing, typography)
- [ ] Dark theme renders correctly across all new components
- [ ] `bun build` completes without errors

---

## Potential Risks and Mitigations

1. **Risk: Form submissions have no backend**
   - Mitigation: Forms use client-side state only. Add a clear comment in each form component indicating where backend integration should happen. The UI is fully functional for demonstration.

2. **Risk: shadcn/ui component installation may conflict with existing Tailwind v4 setup**
   - Mitigation: The project already has working shadcn/ui components (Button, Card, Badge, etc.). New components should install cleanly. If issues arise, manually create the component files following the existing patterns.

3. **Risk: Too many new nav items may crowd the header**
   - Mitigation: Consider grouping the new pages under a "Community" dropdown or placing them as secondary items. Alternatively, keep them in the nav but monitor spacing — the existing nav only has Home, Events, Blog, so adding 3 items (total 6) should still fit on desktop. Mobile nav handles overflow naturally.

4. **Risk: Large CFP form may have poor mobile UX**
   - Mitigation: Use responsive grid layout (single column on mobile, two columns on desktop for short fields). All textareas and selects should be full-width on mobile.

5. **Risk: Email notification and CFP form data is lost on page refresh**
   - Mitigation: This is acceptable for the initial implementation. Document that backend integration is needed. Consider adding localStorage persistence as a future enhancement.

---

## Alternative Approaches

1. **Single "Get Involved" page with tabs**: Instead of 3 separate pages, create one `/get-involved` page with tabbed sections for Volunteer, Speakers, and Sponsors.
   - Trade-off: Simpler navigation (one nav item) but longer page and more complex component. Less SEO-friendly for individual topics. The separate pages approach is better for discoverability and focused content.

2. **Modal-based forms**: Open the volunteer email signup and CFP form in modal dialogs instead of inline sections.
   - Trade-off: Cleaner page layout but adds complexity with dialog state management. Inline forms are more accessible and have better conversion rates for this use case.

3. **Third-party form services (e.g., Google Forms, Typeform)**: Embed or link to external forms instead of building custom forms.
   - Trade-off: Faster to implement but loses design consistency and requires users to leave the site. Custom forms maintain the brand experience and can be connected to any backend later.

4. **Astro-only pages (no React hydration)**: Build all components as `.astro` files instead of React components.
   - Trade-off: Smaller JS bundle but loses interactivity (form state, validation, loading states). React components are needed for the interactive form elements.
