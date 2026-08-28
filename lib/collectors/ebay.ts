import { SEARCH_CENTER, WATCH_RULES } from "@/lib/config";
import type { RawListing } from "@/lib/domain/listing";
import type { Collector, CollectorContext, CollectorResult } from "./types";

type EbaySummary = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price?: { value: string; currency: string };
  shippingOptions?: Array<{ shippingCost?: { value: string } }>;
  itemLocation?: { city?: string; stateOrProvince?: string; postalCode?: string };
  condition?: string;
  image?: { imageUrl?: string };
  itemCreationDate?: string;
};

function dollarsToCents(value?: string) {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

async function applicationToken(context: CollectorContext) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await context.fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    signal: context.signal,
  });
  if (!response.ok) throw new Error(`eBay token request failed (${response.status})`);
  return (await response.json()) as { access_token: string };
}

function toRaw(item: EbaySummary): RawListing {
  const location = item.itemLocation;
  return {
    source: "ebay",
    sourceListingId: item.itemId,
    url: item.itemWebUrl,
    title: item.title,
    priceCents: dollarsToCents(item.price?.value),
    shippingCents: dollarsToCents(item.shippingOptions?.[0]?.shippingCost?.value) ?? 0,
    location: [location?.city, location?.stateOrProvince].filter(Boolean).join(", ") || null,
    condition: item.condition,
    imageUrl: item.image?.imageUrl,
    postedAt: item.itemCreationDate,
    raw: item,
  };
}

export class EbayCollector implements Collector {
  source = "ebay" as const;

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const startedAt = new Date().toISOString();
    const token = await applicationToken(context);
    if (!token) {
      return {
        source: this.source,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "disabled",
        listings: [],
        warnings: ["Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to enable live eBay results."],
      };
    }

    const listings: RawListing[] = [];
    const warnings: string[] = [];
    for (const rule of WATCH_RULES) {
      const params = new URLSearchParams({
        q: `${rule.brand} vintage ${rule.category === "speaker" ? "speakers" : "stereo receiver"}`,
        limit: "50",
        filter: [
          "pickupCountry:US",
          `pickupPostalCode:${SEARCH_CENTER.postalCode}`,
          `pickupRadius:${SEARCH_CENTER.radiusMiles}`,
          "pickupRadiusUnit:mi",
          "deliveryOptions:{SELLER_ARRANGED_LOCAL_PICKUP}",
        ].join(","),
      });
      const response = await context.fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
          signal: context.signal,
        },
      );
      if (!response.ok) {
        warnings.push(`${rule.brand} ${rule.category}: eBay returned ${response.status}.`);
        continue;
      }
      const payload = (await response.json()) as { itemSummaries?: EbaySummary[] };
      listings.push(...(payload.itemSummaries ?? []).map(toRaw));
    }

    return {
      source: this.source,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: warnings.length ? "degraded" : "healthy",
      listings,
      warnings,
    };
  }
}
