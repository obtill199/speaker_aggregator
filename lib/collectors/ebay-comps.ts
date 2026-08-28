import type { NormalizedListing } from "@/lib/domain/listing";
import type { Comparable } from "@/lib/domain/scoring";

type FindingMoney = { "@currencyId"?: string; __value__?: string };
type FindingItem = {
  title?: string[];
  sellingStatus?: Array<{ currentPrice?: FindingMoney[] }>;
  shippingInfo?: Array<{ shippingServiceCost?: FindingMoney[] }>;
  listingInfo?: Array<{ endTime?: string[] }>;
};
type FindingPayload = {
  findCompletedItemsResponse?: Array<{
    ack?: string[];
    errorMessage?: Array<{ error?: Array<{ message?: string[] }> }>;
    searchResult?: Array<{ item?: FindingItem[] }>;
  }>;
};

export type ComparableMap = Record<string, Comparable[]>;

function cents(value?: FindingMoney) {
  if (!value || value["@currencyId"] !== "USD") return null;
  const amount = Number(value.__value__);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function modelMatch(listing: NormalizedListing, soldTitle: string): Comparable["modelMatch"] {
  const normalized = soldTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const model = listing.model?.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (model && normalized.includes(model)) return "exact";
  if (listing.brand && normalized.includes(listing.brand.toLowerCase())) return "family";
  return "category";
}

async function findCompletedItems(query: string, appId: string, fetcher: typeof fetch) {
  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.13.0",
    "SECURITY-APPNAME": appId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords: query,
    "paginationInput.entriesPerPage": "20",
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "itemFilter(1).name": "EndTimeFrom",
    "itemFilter(1).value": new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const response = await fetcher(`https://svcs.ebay.com/services/search/FindingService/v1?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return { comparables: [], warning: `sold comps returned ${response.status}` };
  const root = ((await response.json()) as FindingPayload).findCompletedItemsResponse?.[0];
  if (!root || root.ack?.[0] === "Failure") {
    return { comparables: [], warning: root?.errorMessage?.[0]?.error?.[0]?.message?.[0] ?? "sold comps were unavailable" };
  }
  return {
    comparables: (root.searchResult?.[0]?.item ?? []).flatMap((item) => {
      const price = cents(item.sellingStatus?.[0]?.currentPrice?.[0]);
      const shipping = cents(item.shippingInfo?.[0]?.shippingServiceCost?.[0]) ?? 0;
      const title = item.title?.[0];
      const soldAt = item.listingInfo?.[0]?.endTime?.[0];
      return price && title && soldAt ? [{ title, soldPriceCents: price + shipping, soldAt }] : [];
    }),
  };
}

export async function collectEbayComparables(listings: NormalizedListing[], fetcher: typeof fetch = fetch) {
  const appId = process.env.EBAY_CLIENT_ID;
  if (!appId) return { comparables: {} as ComparableMap, warnings: [] as string[] };

  const candidates = listings.filter((listing) => listing.source === "ebay").slice(0, 40);
  const queryFor = (listing: NormalizedListing) =>
    [listing.brand, listing.model ?? listing.title.split(/[-—|]/)[0]].filter(Boolean).join(" ");
  const uniqueQueries = [...new Set(candidates.map(queryFor))];
  const resolved = new Map<string, Awaited<ReturnType<typeof findCompletedItems>>>();
  for (let index = 0; index < uniqueQueries.length; index += 5) {
    await Promise.all(uniqueQueries.slice(index, index + 5).map(async (query) => {
      resolved.set(query, await findCompletedItems(query, appId, fetcher));
    }));
  }

  const comparables: ComparableMap = {};
  const warnings = new Set<string>();
  for (const listing of candidates) {
    const query = queryFor(listing);
    const result = resolved.get(query);
    if (result?.warning) warnings.add(`${query}: ${result.warning}`);
    comparables[listing.id] = (result?.comparables ?? []).map((item) => ({
      soldPriceCents: item.soldPriceCents,
      soldAt: item.soldAt,
      modelMatch: modelMatch(listing, item.title),
    }));
  }
  return { comparables, warnings: [...warnings] };
}
