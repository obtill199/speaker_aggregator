import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

async function listing(overrides = {}) {
  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  return normalizeListing({
    source: "manual",
    sourceListingId: "score-test",
    url: "https://example.com/item",
    title: "JBL L100 vintage speakers",
    description: "Tested and working",
    priceCents: 35000,
    location: "Wichita, KS",
    latitude: 37.6872,
    longitude: -97.3301,
    ...overrides,
  });
}

function comps(values) {
  return values.map((soldPriceCents, index) => ({
    soldPriceCents,
    soldAt: `2026-0${index + 2}-01T00:00:00.000Z`,
    modelMatch: index < 4 ? "exact" : "family",
  }));
}

test("grades a high-margin exact-model opportunity as great", async () => {
  const { scoreListing } = await vite.ssrLoadModule("/lib/domain/scoring.ts");
  const result = scoreListing(await listing(), comps([90000, 95000, 100000, 105000, 110000]));
  assert.equal(result.grade, "great");
  assert.ok(result.score >= 80);
  assert.equal(result.confidence, "high");
  assert.ok(result.expectedProfitCents > 30000);
});

test("penalizes repair risk and overpriced equipment", async () => {
  const { scoreListing } = await vite.ssrLoadModule("/lib/domain/scoring.ts");
  const result = scoreListing(
    await listing({
      priceCents: 105000,
      description: "Untested, dead tweeter, water damage, missing grilles. Sold as-is.",
    }),
    comps([80000, 85000, 90000, 92000]),
  );
  assert.equal(result.grade, "bad");
  assert.ok(result.repairReserveCents >= 40000);
  assert.ok(result.expectedProfitCents < 0);
});

test("does not invent a score without price or sold comparables", async () => {
  const { scoreListing } = await vite.ssrLoadModule("/lib/domain/scoring.ts");
  const noPrice = scoreListing(await listing({ priceCents: null }), comps([80000, 90000]));
  assert.equal(noPrice.grade, "needs-review");
  assert.equal(noPrice.score, null);

  const noComps = scoreListing(await listing(), []);
  assert.equal(noComps.grade, "needs-review");
  assert.equal(noComps.score, null);
});
