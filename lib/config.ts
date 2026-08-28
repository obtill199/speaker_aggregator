export const SEARCH_CENTER = {
  label: "Udall, Kansas",
  postalCode: "67146",
  latitude: 37.3875,
  longitude: -97.1145,
  radiusMiles: 250,
} as const;

export const WATCH_RULES = [
  { category: "speaker", brand: "JBL", aliases: ["jbl"] },
  { category: "speaker", brand: "Klipsch", aliases: ["klipsch", "klipsh"] },
  { category: "speaker", brand: "Advent", aliases: ["advent"] },
  { category: "speaker", brand: "Pioneer", aliases: ["pioneer", "pioner"] },
  { category: "receiver", brand: "Sansui", aliases: ["sansui"] },
  { category: "receiver", brand: "Pioneer", aliases: ["pioneer", "pioner"] },
  { category: "receiver", brand: "Marantz", aliases: ["marantz"] },
  { category: "receiver", brand: "Yamaha", aliases: ["yamaha"] },
] as const;

export const VINTAGE_TERMS = [
  "vintage",
  "classic",
  "stereo",
  "receiver",
  "loudspeaker",
  "wood cabinet",
  "bookshelf speaker",
  "floor speaker",
] as const;

export const EXCLUDED_TERMS = [
  "bluetooth",
  "soundbar",
  "car audio",
  "marine",
  "earbud",
  "empty cabinet",
  "speaker stand",
] as const;

export const VINTAGE_CUTOFF_YEAR = 2000;

export const SOURCE_LABELS = {
  ebay: "eBay",
  facebook: "Facebook Marketplace",
  reverb: "Reverb",
  estatesales: "EstateSales.net",
  usaudiomart: "US Audio Mart",
  manual: "Manual",
} as const;
