# Plan Addendum — Replace Pretix Iframe Embed with a Custom Component

Created: 2026-07-04
Status: discovery-first plan; do NOT implement until account-linking/customer-filter discovery is complete or explicitly approved.

## Goal

Replace the current Pretix widget/iframe embed on event detail pages with a native-looking website
component that presents the same ticket/registration information, while keeping Pretix as source of
truth for products, availability, checkout, payment, and order records.

Current website files:
- `src/components/PretixWidget.tsx`
- `src/pages/events/[...slug].astro`
- Event content fields: `pretixUrl`, `pretixSubevent`, `pretixListType`

---

## Important scope split

There are two levels:

### Level 1 — Custom ticket display + Pretix checkout handoff (recommended MVP)
- Website renders native ticket cards/quantity controls.
- Backend fetches catalog/availability from Pretix with read-only token.
- User selection is sent to backend.
- Backend returns a Pretix checkout/order URL or safe preselected handoff.
- User completes payment/legal/order confirmation in Pretix.

### Level 2 — Full custom checkout inside website (defer)
- Website/backend creates complete Pretix orders and handles attendee fields/questions, vouchers,
  quotas, taxes/fees, payment provider handoff, legal terms, order expiry, failure states, and race
  conditions.
- Pretix order creation API exists, but this is a much larger surface and can bypass parts of the
  standard shop validation if used incorrectly.

Recommendation: start with Level 1. Keep `PretixWidget` fallback until proven stable.

---

## Docs-verified starting points

Pretix docs confirm:
- Widget supports item/voucher preselection patterns (`pretix-button`, widget voucher/item filters).
- Order creation API exists:
  `POST /api/v1/organizers/{organizer}/events/{event}/orders/`
- Successful order creation can return a user-facing order/confirmation URL depending on endpoint/version.
- Order creation accepts positions, attendee data, answers, payment provider, invoice data, and can be complex.

Still to discover on live instance:
- exact catalog/items endpoint and fields to use
- quota/availability fields
- whether item preselection can be achieved with a plain URL or `pretix-button` style handoff without iframe
- whether backend-created orders return the intended checkout/payment URL
- how required questions and attendee fields change per event/item

---

## Phase C0 — Discovery spike (before implementation)

For one test Pretix event:

1. Product/catalog discovery
   - Fetch event items/products, variations, categories, prices, currency.
   - Identify availability/quota state and sales start/end.
   - Identify required attendee fields/questions per item.

2. Checkout handoff discovery
   - Test whether a direct URL can preselect items/variations/voucher without rendering iframe.
   - Test `pretix-button` semantics if it can be used as a non-iframe/native handoff.
   - Test backend `POST /orders/` with `simulate=true` if available.
   - Test actual order creation in test mode and record returned `url`/confirmation behavior.

3. Risk assessment
   - Does custom order creation bypass any shop validations we rely on?
   - Does payment provider work correctly for API-created orders?
   - What legal/terms/privacy copy must be shown before handoff?

Exit criteria:
- Chosen handoff path is known: direct URL, preselected button-style URL, or backend-created order URL.
- Catalog endpoint and availability fields are known.
- Required questions/attendee fields are understood for one real event.

---

## Recommended MVP architecture (Level 1)

```text
/events/[slug]
  -> CustomPretixTickets component
  -> GET /api/events/:siteSlug/pretix-catalog
  -> user selects ticket quantities
  -> POST /api/events/:siteSlug/pretix-checkout-link
  -> browser redirects/opens Pretix checkout/order URL
```

Backend retains Pretix API token. Browser receives only sanitized catalog and checkout URL.

---

## Backend endpoints

### Catalog

```http
GET /api/events/:siteSlug/pretix-catalog
```

Response:

```ts
interface PretixCatalog {
  site_slug: string;
  currency: string;
  event: {
    organizer_slug: string;
    event_slug: string;
    name: string;
    date_from: string | null;
  };
  items: PretixCatalogItem[];
  last_refreshed_at: string;
  stale: boolean;
}

interface PretixCatalogItem {
  item_id: number;
  variation_id: number | null;
  name: string;
  description: string | null;
  price: string;
  available: boolean;
  sold_out: boolean;
  quota_left: number | null;
  sales_start: string | null;
  sales_end: string | null;
  requires_attendee_name: boolean;
  requires_questions: boolean;
}
```

### Checkout link / handoff

```http
POST /api/events/:siteSlug/pretix-checkout-link
```

Request:

```ts
{
  selections: Array<{ item_id: number; variation_id: number | null; quantity: number }>;
  voucher?: string;
}
```

Response:

```ts
{
  url: string;
  expires_at?: string;
  method: 'direct_url' | 'pretix_button_semantics' | 'created_order';
}
```

If account-linking from `plan/final_pretix_account_linking_builtin_filtering` is implemented, the
backend can optionally prefill/use the linked customer identifier IF the live Pretix API supports it.
Do not require account linking for public event registration unless product explicitly decides that.

---

## Frontend component

Add:

```text
src/components/events/CustomPretixTickets.tsx
```

Behavior:
- Hydrate with `client:visible` or `client:load` depending on checkout interaction.
- Fetch `pretix-catalog`.
- Render ticket cards or rows with name, description, price, availability, and quantity stepper.
- Show sold-out/closed states.
- Optional voucher input if needed.
- Continue button creates checkout handoff.
- Loading, error, stale states.
- Fallback link to Pretix event page if API fails.

Design:
- Mobile-first stacked cards, large touch targets.
- Desktop row/card layout inside a bordered panel.
- Use shadcn primitives where helpful.
- Use Tailwind tokens (`bg-card`, `border-border`, `text-primary`, etc.).
- Dark-mode first.

---

## Page integration

Modify `src/pages/events/[...slug].astro` behind a feature flag:

```astro
{event.data.pretixUrl && (
  import.meta.env.PUBLIC_ENABLE_CUSTOM_PRETIX === 'true' ? (
    <CustomPretixTickets client:visible siteSlug={event.id} />
  ) : (
    <PretixWidget client:load eventUrl={event.data.pretixUrl} className="w-full" />
  )
)}
```

Keep the current `PretixWidget` fallback until the custom path survives real checkout testing.

---

## Security / correctness rules

- Pretix API key remains backend-only.
- Backend validates item/variation IDs and quantities against live/current catalog before handoff.
- Never trust frontend price/availability.
- If creating orders via API, use Pretix `simulate=true` first where supported.
- Do not store payment data in website/backend.
- Use Pretix checkout/payment page for final payment and legal flow in MVP.

---

## Suggested execution order

1. Finish account-linking discovery first (customer identifier and checkout prefill may matter).
2. Run Phase C0 discovery on a test event.
3. Build read-only custom catalog component.
4. Add checkout handoff using the safest verified path.
5. Feature-flag rollout and keep iframe fallback.
6. Only later consider full in-website checkout if absolutely required.

---

## Exit criteria for MVP

- Event detail page can show ticket products/availability without iframe.
- User can proceed to Pretix checkout/payment safely.
- Pretix remains the source of truth for availability and order creation.
- No Pretix API key reaches the browser.
- Existing iframe widget fallback remains available.
