// Runnable regression: manual priceUsd/thresholdUsd overrides vs rate-derived
// estimates, incl. public USD tier eligibility.
// Run: bun src/components/sponsor/communityDayConfig.check.ts
import type { SponsorTier } from "@/lib/types";
import {
  DEFAULT_USD_EXCHANGE_RATE,
  formatIDR,
  formatUSD,
  formatUsdAmount,
  hasRateDerivedUsd,
  nextSponsorTier,
  packagePriceParts,
  packageUsdPrice,
  resolveSponsorTier,
  sumUsd,
  tierThreshold,
  tierThresholdUsd,
} from "./communityDayConfig";

let failures = 0;
function assertEq(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.error(`FAIL ${msg}\n  actual:   ${a}\n  expected: ${e}`);
  }
}
function assertClose(actual: number, expected: number, msg: string) {
  if (!(Math.abs(actual - expected) < 1e-9)) {
    failures += 1;
    console.error(`FAIL ${msg}\n  actual:   ${actual}\n  expected: ${expected}`);
  }
}

const RATE = DEFAULT_USD_EXCHANGE_RATE; // 17000
// User scenario: IDR 1.5M package, rate estimate ~$88, admin pins it to $100.
const overridden = { priceIdr: 1_500_000, priceUsd: 100 };
const derived = { priceIdr: 1_500_000, priceUsd: null };
const legacy = { priceIdr: 1_500_000 }; // older responses omit priceUsd

// 1. Override wins over rate derivation.
assertEq(packageUsdPrice(overridden, RATE), 100, "override honored");
assertClose(packageUsdPrice(derived, RATE), 1_500_000 / 17_000, "null falls back to rate");
assertClose(packageUsdPrice(legacy, RATE), 1_500_000 / 17_000, "omitted priceUsd falls back to rate");

// 2. Direct USD formatting (no conversion, no "equivalent" wording).
assertEq(formatUsdAmount(100), "$100 USD", "whole USD");
assertEq(formatUsdAmount(88.5), "$88.50 USD", "fractional USD");

// 3. Package display parts: override = exact both currencies; derived = est marker.
assertEq(
  packagePriceParts(overridden, "USD", RATE),
  { primary: "$100 USD", secondary: "IDR 1.500.000" },
  "override USD primary/secondary exact",
);
assertEq(
  packagePriceParts(overridden, "IDR", RATE),
  { primary: "IDR 1.500.000", secondary: "$100 USD" },
  "override IDR primary/secondary exact",
);
assertEq(
  packagePriceParts(derived, "IDR", RATE),
  { primary: "IDR 1.500.000", secondary: "~$88.24 USD (est.)" },
  "derived secondary marked estimate",
);
assertEq(
  packagePriceParts(legacy, "USD", RATE),
  { primary: "~$88.24 USD (est.)", secondary: "IDR 1.500.000" },
  "legacy derived primary marked estimate",
);

// 4. Mixed totals: override-aware sum differs from total/rate.
const selection = [overridden, { priceIdr: 8_500_000, priceUsd: null }];
const totalIdr = selection.reduce((s, p) => s + p.priceIdr, 0); // 10.000.000
assertClose(sumUsd(selection, RATE), 100 + 8_500_000 / 17_000, "mixed USD total sums effective prices");
assertClose(sumUsd(selection, RATE) - totalIdr / RATE, 100 - 1_500_000 / 17_000, "mixed total ≠ naive total/rate");
assertEq(hasRateDerivedUsd(selection), true, "mixed selection flags estimate");
assertEq(hasRateDerivedUsd([overridden]), false, "all-override selection is exact");

// 5. USD budget space: compare against override-aware total, per-package filter.
const budget = 700; // USD
const remaining = budget - sumUsd(selection, RATE); // ≈ 11.76
assertEq(remaining > 0, true, "selection within budget");
assertEq(packageUsdPrice(overridden, RATE) > remaining, false, "override pkg within remaining");
assertEq(
  packageUsdPrice({ priceIdr: 8_500_000, priceUsd: null }, RATE) > remaining,
  true,
  "derived pkg exceeds remaining via USD price",
);

// 6. Back-compat formatters (admin package manager still imports these).
assertEq(formatIDR(1_500_000), "IDR 1.500.000", "formatIDR unchanged");
assertEq(formatUSD(1_700_000, RATE), "$100 USD", "formatUSD unchanged");

// --- Public USD tier eligibility (thresholdUsd overrides) ---
const tier = (t: Partial<SponsorTier> & { id: string; label: string; thresholdIdr: number }): SponsorTier =>
  ({
    thresholdUsd: null,
    accent: "default",
    eventSlug: "community-day-2026",
    updatedAt: "2026-01-01T00:00:00Z",
    ...t,
  });
const bronze = tier({ id: "b", label: "Bronze", thresholdIdr: 5_000_000 }); // USD derived ~294.12
const silver = tier({ id: "s", label: "Silver", thresholdIdr: 10_000_000, thresholdUsd: 100 });
const gold = tier({ id: "g", label: "Gold", thresholdIdr: 25_000_000, thresholdUsd: 500 });
const legacyTier = {
  id: "l",
  eventSlug: "community-day-2026",
  label: "Legacy",
  thresholdIdr: 50_000_000,
  accent: "default",
  updatedAt: "2026-01-01T00:00:00Z",
} as SponsorTier; // older responses omit thresholdUsd entirely
const tiers = [bronze, silver, gold, legacyTier];

// 7. Effective thresholds: override wins; null/omitted fall back to rate;
//    USD overrides can reorder tiers vs IDR (silver usd100 < bronze usd294).
assertClose(tierThresholdUsd(silver, RATE), 100, "threshold override honored");
assertClose(tierThresholdUsd(bronze, RATE), 5_000_000 / 17_000, "null thresholdUsd derives from rate");
assertClose(tierThresholdUsd(legacyTier, RATE), 50_000_000 / 17_000, "omitted thresholdUsd derives from rate");
assertEq(tierThreshold(silver, "IDR", RATE), 10_000_000, "tierThreshold IDR passthrough");
assertClose(tierThreshold(silver, "USD", RATE), 100, "tierThreshold USD override");

// 8. Custom $100 package alone (IDR 1.5M pinned to $100): USD reaches the
//    $100-override Silver tier while the IDR 10M threshold stays unreachable.
const customUsdPkg = { priceIdr: 1_500_000, priceUsd: 100 };
const soloIdr = customUsdPkg.priceIdr;
const soloUsd = packageUsdPrice(customUsdPkg, RATE);
assertEq(resolveSponsorTier(soloIdr, tiers, "IDR", RATE)?.id ?? null, null, "IDR: below every threshold");
assertEq(resolveSponsorTier(soloUsd, tiers, "USD", RATE)?.id, "s", "USD: $100 hits thresholdUsd override");
assertEq(nextSponsorTier(soloIdr, tiers, "IDR", RATE)?.id, "b", "IDR next tier ascending by thresholdIdr");
assertEq(nextSponsorTier(soloUsd, tiers, "USD", RATE)?.id, "b", "USD next tier ascending by effective USD");

// 9. Currency switching: mixed selection (total IDR 10M / USD 600) is Silver
//    in IDR but Gold in USD, with matching next tiers and progress spans.
const selection2 = [customUsdPkg, { priceIdr: 8_500_000, priceUsd: null }];
const total2 = selection2.reduce((s, p) => s + p.priceIdr, 0); // 10.000.000
const totalUsd2 = sumUsd(selection2, RATE); // 100 + 500 = 600
assertEq(resolveSponsorTier(total2, tiers, "IDR", RATE)?.id, "s", "IDR view: Silver at 10M");
assertEq(resolveSponsorTier(totalUsd2, tiers, "USD", RATE)?.id, "g", "USD view: Gold at $600");
assertEq(nextSponsorTier(total2, tiers, "IDR", RATE)?.id, "g", "IDR next: Gold");
assertEq(nextSponsorTier(totalUsd2, tiers, "USD", RATE)?.id, "l", "USD next: Legacy (omitted thresholdUsd)");
assertEq(nextSponsorTier(60_000_000, tiers, "IDR", RATE), null, "top of IDR ladder has no next");
assertEq(nextSponsorTier(3_000, tiers, "USD", RATE), null, "top of USD ladder has no next");
assertEq(resolveSponsorTier(0, tiers, "USD", RATE), null, "zero total never tiers");

// 10. Progress spans between effective thresholds in the active currency.
const idrProgress =
  (total2 - 10_000_000) / (25_000_000 - 10_000_000) * 100; // 0% (just reached Silver)
const usdProgress = (totalUsd2 - 500) / (tierThresholdUsd(legacyTier, RATE) - 500) * 100; // ≈4.1% Gold→Legacy
assertClose(idrProgress, 0, "IDR progress at tier boundary");
assertEq(usdProgress > 0 && usdProgress < 5, true, "USD progress uses effective thresholds");

if (failures > 0) {
  throw new Error(`${failures} check(s) failed`);
}
console.log(`all price + USD tier eligibility checks passed (${RATE} rate)`);
