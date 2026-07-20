# Plan: Dynamic Sponsorship Configurator (Community Day 2026)

## Context & Decisions (locked)
- Two distinct sponsorship models stay separate on `/sponsor`:
  - **Monthly meetup** = full-event collaboration; existing `SponsorTiers` + `SponsorBenefits` stay as-is.
  - **Community Day** = multi-sponsor, a la carte dynamic package configurator.
- Goal: inclusive pricing. Small sponsor (one asset at IDR 2.5M) earns Community Supporter; sponsor at IDR 40M+ earns Platinum. Every selected package earns a named badge.
- **Backend**: none. `mailto:` prepares a draft only; UI must never claim submission, delivery, reservation, or lock-in.
- Provide copy-summary fallback and visible copyable contact email.
- Config-driven inline data now. Add `ponytail:` comment naming `astro:content` as upgrade path only when a second event reuses this model.
- Sponsorship contact: `awsugjakarta@gmail.com`. Update sponsorship-specific references only; do not replace unrelated operational contacts.

## Blocking product input
Confirm exact event date before implementation. Event title says 2026, while source date says `19 October 2025`, which is inconsistent and past. Keep date as `TBD` in config until confirmed; do not ship conflicting date.

## Files
```
src/components/sponsor/
  communityDayConfig.ts
  SponsorConfigurator.tsx
```

Mount `SponsorConfigurator` in `src/pages/sponsor.astro` with `client:visible`. Configurator is below hero; eager `client:load` hydration is unnecessary.

## `/sponsor` section order
1. `SponsorHero` (keep)
2. Community Day section header + `SponsorConfigurator` (new)
3. Monthly meetup section header + `SponsorTiers` (keep)
4. `SponsorBenefits` (keep)
5. `SponsorCTA` (keep)

Headings must clearly distinguish Community Day package requests from monthly meetup collaboration.

## `communityDayConfig.ts`

Event:
```ts
{
  name: "AWS Community Day Jakarta 2026",
  date: "TBD",
  location: "Jakarta, Indonesia",
  tagline: "A New Era of Sponsorship — Developer-First, A La Carte",
}
```

Assets use `{ id, name, price, advantage, category }`.

### Digital & Media
- `web-logo` — IDR 2,500,000 — High-intent brand exposure on `jakarta.awscommunity.id`
- `social-blast` — IDR 2,500,000 — Direct amplification of products or hiring to digital community
- `video-ad` — IDR 5,000,000 — 30–60 second narrative slot or platform demo during breaks
- `email-footer` — IDR 8,000,000 — Brand placement on ticket confirmations, logistics, and post-event email

Do not publish unsupported performance claims such as `60%+ open rate` unless verified data exists.

### On-Site & Physical
- `tshirt` — IDR 6,000,000 — Long-tail visual marketing through event merchandise
- `lanyard` — IDR 7,500,000 — Eye-level presence worn by participants
- `backdrop` — IDR 4,000,000 — Branding in official and participant event photos
- `mc-mention` — IDR 3,500,000 — Verbal sponsor callouts during breaks

### Tier thresholds
Evaluate descending:
- Platinum: `>= 40_000_000`
- Gold: `>= 25_000_000`
- Silver: `>= 10_000_000`
- Community Supporter: `> 0 && < 10_000_000`
- No tier: `0`

Tier text must remain visible; color cannot be sole indicator. Use token-based class maps only.

## Component behavior
- Keep one self-contained React component unless readability requires extraction.
- `useState<Record<assetId, boolean>>` stores selection.
- Derive total and tier from current config; never store derived values.
- At zero selection, show `Select an asset` and no badge tier.
- Format currency with `new Intl.NumberFormat("id-ID")`; render `IDR ${formatted}`.
- Persist selection only. Never store company, email, or goals.
- Initialize persisted selection safely and filter unknown/stale IDs against current asset IDs.
- Prevent initial empty state from overwriting saved data: use a hydration guard before first save.
- If storage access throws, continue with in-memory state.

## Layout
Mobile-first:
- Single column by default.
- `lg:grid-cols-[1fr_380px]` at large screens.
- Left: grouped asset rows using existing `Checkbox` + `Label`, with name, advantage, and formatted price.
- Whole row should provide a clear accessible selection target where existing primitives permit.
- Right: `lg:sticky lg:top-24` summary card with total, tier, disclaimer, and request form.
- Use token classes (`bg-background`, `text-foreground`, `text-primary`, `border-border`) and `cn()`.
- Dark-first styling. Use `tw-animate-css` only where motion adds value; respect existing reduced-motion behavior.

Inclusivity copy:
> Start from IDR 2,500,000. Every partner earns a badge.

Availability/pricing copy:
> Package selections are requests, not reservations. Prices are indicative, subject to availability, and finalized by agreement.

Booth disclaimer, verbatim and prominent:
> No baseline package comes with automatic booths; booths can be added in subsequent phases upon venue capacity confirmation.

## Request form
Use native `<form>` validation plus submit-handler validation:
- Company Name: required, trimmed, sensible `maxLength`.
- Contact Email: required, `type="email"`, sensible `maxLength`.
- Target Technical Goals: `Textarea`, optional, `maxLength={1000}`.
- At least one asset required.
- CTA: `Prepare Sponsorship Email`.

Do not use “Lock In,” “submitted,” “sent,” or “success” wording because `mailto:` cannot verify those outcomes.

## Submit flow
1. Validate company, email, and at least one asset.
2. Build plain-text summary containing selected assets, total, computed tier, goals, and contact details.
3. Build encoded `mailto:`:
   - To: `awsugjakarta@gmail.com`
   - Subject: `Sponsorship Package Request — {company}`
   - Body: summary
4. Set `window.location.href = mailtoUrl`.
5. Show informational state, not success confirmation:
   > Email draft prepared. Send it from your email app to submit your package request.
6. Keep recap visible and provide `Copy Summary`.
7. Show `awsugjakarta@gmail.com` as selectable/copyable text.

Clipboard behavior:
- Try `navigator.clipboard.writeText`.
- On failure, keep summary in a visible selectable read-only `Textarea` for manual copy.
- Announce draft/copy state through `aria-live="polite"`.
- Never claim clipboard success when API rejects.

Mailto body remains small because asset count is fixed and goals are capped at 1000 characters.

## Contact update
Change `SponsorCTA.tsx` and other sponsorship-specific references from `organizers@awsugjakarta.id` to `awsugjakarta@gmail.com`. Do not modify speaker, volunteer, privacy, support, or unrelated contacts without explicit instruction.

## Minimal runnable checks
Extract or expose pure tier calculation where needed and leave one small assert-based check covering:
- `0` → no tier
- `2_500_000` → Community Supporter
- `10_000_000` → Silver
- `25_000_000` → Gold
- `40_000_000` → Platinum

Also verify stale persisted asset IDs are ignored.

## Validation
Run from project root:
```bash
nvm use 22
bun run build
bunx astro check
bunx tsc --noEmit
```

Ignore only confirmed pre-existing `PagesFunction` errors in `functions/api/subscribe.ts` unless that file changes. Review `git status` and `git diff`; scan changes for secrets.

## Status: COMPLETED

Implemented by orchestrator + 3 parallel sub-agents (divide & conquer).

Files:
- `src/components/sponsor/communityDayConfig.ts` — data + helpers (`computeSponsorTier`, `formatIDR`, `sanitizeSelection`).
- `src/components/sponsor/communityDayConfig.check.ts` — node assert self-check.
- `src/components/sponsor/SponsorConfigurator.tsx` — React component.
- `src/pages/sponsor.astro` — wired configurator in section 2, added Monthly Meetup header in section 3.

Deviations from plan:
- `formatIDR` uses `Intl.NumberFormat("id-ID")` per literal spec. Indonesian `.` separator. Plan prose example showed comma (US style) — that example was wrong; spec literal won.
- Inclusivity copy in component uses `formatIDR(2_500_000)` instead of hardcoded `IDR 2,500,000` so separator stays consistent.

Validation:
- `bun run src/components/sponsor/communityDayConfig.check.ts` → pass.
- `bun run build` → green (20 pages, `/sponsor/index.html` built).
- `bunx astro check` → only pre-existing errors (`functions/api/subscribe.ts` PagesFunction per AGENT.md; `AuthProvider.tsx` FedCM prop — unrelated).
- `bunx tsc --noEmit` → no errors in new/modified files.

## Open item
1. Confirm exact Community Day date. Replace `TBD` only after confirmation.