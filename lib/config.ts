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
] as const;

export const VINTAGE_TERMS = [
  "vintage",
  "classic",
  "retro",
  "oiled walnut",
  "walnut cabinet",
  "silverface",
  "made in japan",
] as const;

export const MODERN_SPEAKER_TERMS = [
  "partybox",
  "party box",
  "flip 5",
  "flip 6",
  "flip 7",
  "charge 4",
  "charge 5",
  "charge 6",
  "boombox",
  "the fives",
  "the sixes",
  "the nines",
  "reference premiere",
  "rp 600",
  "rp 800",
  "rp 1600",
  "r 41m",
  "r 51m",
  "andrew jones",
  "sp fs52",
  "305p",
  "308p",
  "4305p",
  "atmos",
  "soundbar",
  "powered bluetooth",
] as const;

export const EXCLUDED_TERMS = [
  "bluetooth",
  "soundbar",
  "car audio",
  "marine",
  "earbud",
  "empty cabinet",
  "speaker stand",
  "estate sale",
  "estate sales",
  "estatesale",
  "estate auction",
] as const;

// Title-only. Descriptions of real gear often mention knobs, lamps, or recaps.
export const ACCESSORY_TITLE_TERMS = [
  "tom mount",
  "tom holder",
  "drum mount",
  "horn adapter",
  "fuse lamp",
  "fuse style",
  "dial lamp",
  "lamp kit",
  "grille cloth",
  "cover only",
  "speaker cable",
  "patch cable",
  "remote only",
  "faceplate only",
  "guitar speaker",
  "bass speaker",
  "replacement speaker",
  "compression driver",
  "midrange driver",
  "mid range driver",
  "speaker basket",
  "picture frame",
  "album display",
  "home theater",
  "av receiver",
  "a v receiver",
  "diversity receiver",
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
