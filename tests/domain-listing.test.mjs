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

test("normalizes misspelled target brands and receiver category", async () => {
  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const listing = normalizeListing({
    source: "facebook",
    sourceListingId: "one",
    url: "https://example.com/one",
    title: "Pioner SX-780 vintage stereo receiver",
    priceCents: 22500,
    location: "Wichita, KS",
    latitude: 37.6872,
    longitude: -97.3301,
  });
  assert.equal(listing.brand, "Pioneer");
  assert.equal(listing.model, "SX-780");
  assert.equal(listing.category, "receiver");
  assert.equal(listing.isVintage, true);
  assert.equal(listing.excluded, false);
  assert.ok(listing.distanceMiles < 60);
});

test("excludes irrelevant modern audio and out-of-radius listings", async () => {
  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const modern = normalizeListing({
    source: "manual",
    sourceListingId: "modern",
    url: "https://example.com/modern",
    title: "JBL Bluetooth soundbar",
  });
  assert.equal(modern.excluded, true);
  assert.equal(modern.exclusionReason, "bluetooth");

  const distant = normalizeListing({
    source: "manual",
    sourceListingId: "distant",
    url: "https://example.com/distant",
    title: "Vintage JBL L100 speakers",
    latitude: 39.7392,
    longitude: -104.9903,
  });
  assert.equal(distant.excluded, true);
  assert.match(distant.exclusionReason, /outside-250-mile-radius/);
});

test("deduplicates exact IDs and probable cross-posts", async () => {
  const { deduplicateListings, normalizeListing } = await vite.ssrLoadModule(
    "/lib/domain/listing.ts",
  );
  const first = normalizeListing({
    source: "facebook",
    sourceListingId: "same",
    url: "https://example.com/1",
    title: "JBL L100 vintage speakers",
    priceCents: 70000,
    location: "Wichita, KS",
  });
  const duplicate = { ...first, lastSeenAt: "2026-08-28T12:00:00.000Z" };
  const crossPost = normalizeListing({
    source: "manual",
    sourceListingId: "cross",
    url: "https://example.com/2",
    title: "JBL L100 classic speakers",
    priceCents: 70500,
    location: "Wichita, KS",
  });
  assert.equal(deduplicateListings([first, duplicate, crossPost]).length, 1);
});
