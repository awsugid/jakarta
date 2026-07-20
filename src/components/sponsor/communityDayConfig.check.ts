import assert from "node:assert/strict";
import { computeSponsorTier, formatIDR, sanitizeSelection, sponsorAssets } from "./communityDayConfig";

// Tier thresholds
assert.equal(computeSponsorTier(0).id, "none");
assert.equal(computeSponsorTier(2_500_000).id, "supporter");
assert.equal(computeSponsorTier(10_000_000).id, "silver");
assert.equal(computeSponsorTier(25_000_000).id, "gold");
assert.equal(computeSponsorTier(40_000_000).id, "platinum");
assert.equal(computeSponsorTier(99_999_999).id, "platinum");
assert.equal(computeSponsorTier(9_999_999).id, "supporter");

// Boundary below silver
assert.equal(computeSponsorTier(24_999_999).id, "silver");

// formatIDR
assert.equal(formatIDR(2_500_000), "IDR 2.500.000");
assert.equal(formatIDR(0), "IDR 0");

// Sanitize stale ids
const validIds = sponsorAssets.map((a) => a.id);
const cleaned = sanitizeSelection(
  { "web-logo": true, "stale-thing": true, "tshirt": false, "nope": 1 },
  validIds
);
assert.deepEqual(cleaned, { "web-logo": true });

// Sanitize garbage input
assert.deepEqual(sanitizeSelection(null, validIds), {});
assert.deepEqual(sanitizeSelection("nope", validIds), {});
assert.deepEqual(sanitizeSelection(undefined, validIds), {});

console.log("communityDayConfig checks passed");
