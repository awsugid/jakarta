// Runnable regression: manual priceUsd overrides vs rate-derived estimates.
// Run: bun src/components/sponsor/communityDayConfig.check.ts
import {
  DEFAULT_USD_EXCHANGE_RATE,
  formatIDR,
  formatUSD,
  formatUsdAmount,
  hasRateDerivedUsd,
  packagePriceParts,
  packageUsdPrice,
  sumUsd,
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

if (failures > 0) {
  throw new Error(`${failures} check(s) failed`);
}
console.log(`all price override checks passed (${RATE} rate)`);
