import {
  EXCLUDED_TERMS,
  SEARCH_CENTER,
  VINTAGE_CUTOFF_YEAR,
  VINTAGE_TERMS,
  WATCH_RULES,
} from "@/lib/config";

export type ListingCategory = "speaker" | "receiver" | "estate-lead";
export type ListingSource =
  | "ebay"
  | "facebook"
  | "reverb"
  | "estatesales"
  | "usaudiomart"
  | "manual";

export type RawListing = {
  source: ListingSource;
  sourceListingId: string;
  url: string;
  title: string;
  description?: string | null;
  priceCents?: number | null;
  shippingCents?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  condition?: string | null;
  imageUrl?: string | null;
  postedAt?: Date | string | number | null;
  raw?: unknown;
};

export type NormalizedListing = {
  id: string;
  source: ListingSource;
  sourceListingId: string;
  url: string;
  title: string;
  normalizedTitle: string;
  description: string;
  brand: string | null;
  model: string | null;
  category: ListingCategory;
  priceCents: number | null;
  shippingCents: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number | null;
  condition: string | null;
  imageUrl: string | null;
  postedAt: string | null;
  isVintage: boolean;
  excluded: boolean;
  exclusionReason: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  sourcePayload: string | null;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function identifyBrand(text: string) {
  const normalized = ` ${normalizeText(text)} `;
  for (const rule of WATCH_RULES) {
    if (rule.aliases.some((alias) => normalized.includes(` ${alias} `))) {
      return rule.brand;
    }
  }
  return null;
}

export function classifyCategory(text: string): ListingCategory {
  const normalized = normalizeText(text);
  if (/estate sale|auction|whole house|sale preview/.test(normalized)) {
    return "estate-lead";
  }
  if (/receiver|amplifier|integrated amp|stereo amp|tuner/.test(normalized)) {
    return "receiver";
  }
  return "speaker";
}

export function extractModel(title: string, brand: string | null) {
  if (!brand) return null;
  const withoutBrand = title.replace(new RegExp(brand, "ig"), " ");
  const candidates = withoutBrand.match(/\b[A-Z]{0,4}[- ]?\d{2,4}[A-Z]{0,3}\b/gi);
  return candidates?.[0]?.replace(/\s+/g, "-").toUpperCase() ?? null;
}

export function isVintageListing(text: string, brand: string | null) {
  const normalized = normalizeText(text);
  const years = [...normalized.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) =>
    Number(match[1]),
  );
  if (years.some((year) => year <= VINTAGE_CUTOFF_YEAR)) return true;
  if (VINTAGE_TERMS.some((term) => normalized.includes(term))) return true;
  return Boolean(brand && /wood|silver face|silverface|stereo|classic/.test(normalized));
}

export function exclusionReason(text: string) {
  const normalized = normalizeText(text);
  return EXCLUDED_TERMS.find((term) => normalized.includes(term)) ?? null;
}

export function distanceMiles(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsePostedAt(value: RawListing["postedAt"]) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeListing(raw: RawListing, now = new Date()): NormalizedListing {
  const combined = `${raw.title} ${raw.description ?? ""}`;
  const brand = identifyBrand(combined);
  const reason = exclusionReason(combined);
  const distance =
    raw.latitude != null && raw.longitude != null
      ? distanceMiles(SEARCH_CENTER, {
          latitude: raw.latitude,
          longitude: raw.longitude,
        })
      : null;
  const timestamp = now.toISOString();
  return {
    id: `${raw.source}_${stableHash(raw.sourceListingId)}`,
    source: raw.source,
    sourceListingId: raw.sourceListingId,
    url: raw.url,
    title: raw.title.trim(),
    normalizedTitle: normalizeText(raw.title),
    description: raw.description?.trim() ?? "",
    brand,
    model: extractModel(raw.title, brand),
    category: classifyCategory(combined),
    priceCents: raw.priceCents ?? null,
    shippingCents: raw.shippingCents ?? 0,
    location: raw.location?.trim() ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    distanceMiles: distance === null ? null : Math.round(distance * 10) / 10,
    condition: raw.condition?.trim() ?? null,
    imageUrl: raw.imageUrl ?? null,
    postedAt: parsePostedAt(raw.postedAt),
    isVintage: isVintageListing(combined, brand),
    excluded:
      Boolean(reason) || (distance !== null && distance > SEARCH_CENTER.radiusMiles),
    exclusionReason:
      reason ??
      (distance !== null && distance > SEARCH_CENTER.radiusMiles
        ? `outside-${SEARCH_CENTER.radiusMiles}-mile-radius`
        : null),
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    sourcePayload: raw.raw === undefined ? null : JSON.stringify(raw.raw),
  };
}

function crossPostKey(listing: NormalizedListing) {
  const priceBucket = listing.priceCents === null ? "unpriced" : Math.round(listing.priceCents / 2500);
  const place = normalizeText(listing.location ?? "unknown").split(" ").slice(0, 2).join("-");
  return [listing.brand ?? "unknown", listing.model ?? listing.normalizedTitle, priceBucket, place]
    .join("|")
    .toLowerCase();
}

export function deduplicateListings(listings: NormalizedListing[]) {
  const bySourceId = new Map<string, NormalizedListing>();
  for (const listing of listings) {
    const key = `${listing.source}:${listing.sourceListingId}`;
    const current = bySourceId.get(key);
    if (!current || listing.lastSeenAt > current.lastSeenAt) bySourceId.set(key, listing);
  }

  const seenCrossPosts = new Set<string>();
  const unique: NormalizedListing[] = [];
  for (const listing of bySourceId.values()) {
    const key = crossPostKey(listing);
    if (seenCrossPosts.has(key)) continue;
    seenCrossPosts.add(key);
    unique.push(listing);
  }
  return unique;
}
