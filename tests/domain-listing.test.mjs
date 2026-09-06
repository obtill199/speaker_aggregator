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

test("excludes whole-house estate sale leads", async () => {
  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const sale = normalizeListing({
    source: "estatesales",
    sourceListingId: "yukon",
    url: "https://www.estatesales.net/example",
    title: "Estate sale: Yukon Sale",
    location: "Yukon, OK",
  });
  assert.equal(sale.excluded, true);
  assert.equal(sale.exclusionReason, "estate sale");
});

test("keeps complete vintage speakers", async () => {
  const { normalizeListing, isVintageListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const speaker = normalizeListing({
    source: "reverb",
    sourceListingId: "l100",
    url: "https://reverb.com/item/l100",
    title: "Vintage JBL L100 Century speakers",
    description: "Original pair. Knobs and grille cloth are worn.",
    priceCents: 82500,
  });
  const heresy = normalizeListing({
    source: "reverb",
    sourceListingId: "heresy",
    url: "https://reverb.com/item/heresy",
    title: "Klipsch Heresy speakers in oiled walnut",
    priceCents: 180000,
  });
  const advent = normalizeListing({
    source: "facebook",
    sourceListingId: "legacy",
    url: "https://example.com/legacy",
    title: "Advent Legacy floor speakers",
    priceCents: 25000,
  });
  assert.equal(speaker.isVintage, true);
  assert.equal(heresy.isVintage, true);
  assert.equal(advent.isVintage, true);
  assert.equal(isVintageListing("Pioneer HPM-100 speakers"), true);
});

test("rejects modern speakers even when the title says vintage", async () => {
  const { isVintageListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  assert.equal(isVintageListing("JBL PartyBox 310 speakers"), false);
  assert.equal(isVintageListing("Klipsch The Fives powered speakers"), false);
  assert.equal(isVintageListing("Klipsch RP-600M Reference Premiere bookshelf speakers"), false);
  assert.equal(isVintageListing("JBL 305P MkII studio monitors 2018"), false);
  assert.equal(isVintageListing("JBL speakers"), false);
});

test("drops Reverb parts, drum hardware, loose drivers, and AVRs", async () => {
  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const cases = [
    ["(10) Green LED 8V Fuse Style Lamps for Sansui, Pioneer, Marantz", "fuse style"],
    ["Yamaha 2-Hole Receiver Double Tom Mount Holder Post - Vintage", "tom mount"],
    ["JBL D123 12\" vintage speaker", "loose-driver"],
    ["Yamaha HTR-5730 Receiver HiFi Stereo Vintage 5.1 Channel Home Theater Audio AVR", "home theater"],
    ["Pioneer VSX-D503S AV Receiver 1994", "av receiver"],
    ["JBL Horn Adapter 1\u201d To 1 3/8\u201d throat", "horn adapter"],
  ];
  for (const [title, reason] of cases) {
    const listing = normalizeListing({
      source: "reverb",
      sourceListingId: reason,
      url: "https://reverb.com/item/x",
      title,
      priceCents: 8000,
    });
    assert.equal(listing.excluded, true, title);
    assert.equal(listing.exclusionReason, reason, title);
  }
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
