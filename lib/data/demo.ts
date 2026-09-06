import type { RawListing } from "@/lib/domain/listing";
import { normalizeListing } from "@/lib/domain/listing";
import type { Comparable } from "@/lib/domain/scoring";
import { scoreListing } from "@/lib/domain/scoring";

const rawListings: RawListing[] = [
  {
    source: "facebook",
    sourceListingId: "demo-jbl-l100",
    url: "https://www.facebook.com/marketplace/",
    title: "JBL L100 Century speakers — original pair",
    description: "Both play. Cabinets have light scratches and the grilles are missing.",
    priceCents: 52500,
    location: "Wichita, KS",
    latitude: 37.6872,
    longitude: -97.3301,
    condition: "Used — good",
    postedAt: "2026-08-28T00:30:00.000Z",
  },
  {
    source: "ebay",
    sourceListingId: "demo-advent-large",
    url: "https://www.ebay.com/",
    title: "Large Advent vintage speakers — walnut pair",
    description: "Original drivers. Both play, but the woofer surrounds need refoaming.",
    priceCents: 22500,
    shippingCents: 4500,
    location: "Tulsa, OK",
    latitude: 36.154,
    longitude: -95.9928,
    condition: "Used — fair",
    postedAt: "2026-08-27T18:10:00.000Z",
  },
  {
    source: "usaudiomart",
    sourceListingId: "demo-klipsch-heresy",
    url: "https://www.usaudiomart.com/classifieds/3-speakers/",
    title: "Klipsch Heresy II walnut pair",
    description: "1989 pair, consecutive serials, tested and working. One small veneer chip.",
    priceCents: 70000,
    location: "Overland Park, KS",
    latitude: 38.9822,
    longitude: -94.6708,
    condition: "Very good",
    postedAt: "2026-08-27T15:00:00.000Z",
  },
  {
    source: "reverb",
    sourceListingId: "demo-jbl-4311",
    url: "https://reverb.com/",
    title: "JBL 4311 vintage studio monitor pair",
    description: "All drivers work. Cabinets have veneer damage and need refinishing.",
    priceCents: 85000,
    location: "Ponca City, OK",
    latitude: 36.7069,
    longitude: -97.0856,
    condition: "Used — fair",
    postedAt: "2026-08-27T12:00:00.000Z",
  },
  {
    source: "facebook",
    sourceListingId: "demo-pioneer-hpm",
    url: "https://www.facebook.com/marketplace/",
    title: "Pioner HPM-100 speakers",
    description: "Vintage speakers. Untested from storage, cabinets are solid.",
    priceCents: 37500,
    location: "Salina, KS",
    latitude: 38.8403,
    longitude: -97.6114,
    condition: "Used — fair",
    postedAt: "2026-08-27T09:20:00.000Z",
  },
  {
    source: "reverb",
    sourceListingId: "demo-pioneer-cs99a",
    url: "https://reverb.com/c/home-audio/speakers",
    title: "Pioneer CS-99A vintage speaker pair",
    description: "Tested and working. Original lattice grilles and drivers are intact.",
    priceCents: 60000,
    shippingCents: 6500,
    location: "Kansas City, MO",
    latitude: 39.0997,
    longitude: -94.5786,
    condition: "Excellent",
    postedAt: "2026-08-26T21:00:00.000Z",
  },
];

const comparableValues: Record<string, number[]> = {
  "demo-jbl-l100": [105000, 112500, 119000, 125000, 132000, 138000],
  "demo-advent-large": [42500, 47500, 50000, 54000, 57500],
  "demo-klipsch-heresy": [70000, 74000, 78000, 82500, 86000],
  "demo-pioneer-hpm": [72000, 79000, 85000, 89000, 94000],
  "demo-jbl-4311": [110000, 117500, 125000, 132500, 140000],
  "demo-pioneer-cs99a": [70000, 76000, 82500, 87500, 92000],
};

export const DEMO_LISTINGS = rawListings.map((raw, listingIndex) => {
  const normalized = normalizeListing(raw, new Date("2026-08-28T01:00:00.000Z"));
  const values = comparableValues[raw.sourceListingId] ?? [];
  const comparables: Comparable[] = values.map((soldPriceCents, index) => ({
    soldPriceCents,
    soldAt: new Date(Date.UTC(2026, 7 - Math.min(index, 6), 15)).toISOString(),
    modelMatch: index < 4 ? "exact" : "family",
  }));
  return {
    ...normalized,
    score: scoreListing(normalized, comparables),
    demoOrder: listingIndex,
  };
});
