import { WATCH_RULES } from "@/lib/config";
import type { RawListing } from "@/lib/domain/listing";
import type { Collector, CollectorContext, CollectorResult } from "./types";

type ReverbListing = {
  id: number;
  make?: string;
  model?: string;
  title: string;
  description?: string;
  created_at?: string;
  condition?: { display_name?: string };
  price?: { amount_cents?: number; currency?: string };
  shipping?: { rates?: Array<{ region_code?: string; rate?: { amount_cents?: number; currency?: string } }> };
  _links?: { web?: { href?: string }; photo?: { href?: string } };
};

function stripHtml(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function toRaw(item: ReverbListing): RawListing | null {
  if (item.price?.currency && item.price.currency !== "USD") return null;
  const shipping = item.shipping?.rates?.find((rate) => rate.region_code === "US_CON")?.rate;
  return {
    source: "reverb",
    sourceListingId: String(item.id),
    url: item._links?.web?.href ?? `https://reverb.com/item/${item.id}`,
    title: item.title,
    description: stripHtml(item.description),
    priceCents: item.price?.amount_cents ?? null,
    shippingCents: shipping?.currency === "USD" ? shipping.amount_cents ?? 0 : 0,
    location: null,
    condition: item.condition?.display_name,
    imageUrl: item._links?.photo?.href,
    postedAt: item.created_at,
    raw: item,
  };
}

async function fetchReverb(context: CollectorContext, url: string, headers: Record<string, string>) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await context.fetch(url, { headers, signal: context.signal });
    if (response.ok || (response.status !== 429 && response.status < 500)) return response;
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return response!;
}

export class ReverbCollector implements Collector {
  source = "reverb" as const;

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const startedAt = new Date().toISOString();
    const listings: RawListing[] = [];
    const warnings: string[] = [];
    for (const rule of WATCH_RULES) {
      const params = new URLSearchParams({ query: `${rule.brand} vintage ${rule.category === "speaker" ? "speaker" : "receiver"}`, per_page: "40" });
      const response = await fetchReverb(
        context,
        `https://api.reverb.com/api/listings/all?${params}`,
        { Accept: "application/hal+json", "Accept-Version": "3.0", ...(process.env.REVERB_TOKEN ? { Authorization: `Bearer ${process.env.REVERB_TOKEN}` } : {}) },
      );
      if (!response.ok) {
        warnings.push(`${rule.brand} ${rule.category}: Reverb returned ${response.status}.`);
        continue;
      }
      const payload = (await response.json()) as { listings?: ReverbListing[] };
      listings.push(...(payload.listings ?? []).flatMap((item) => { const mapped = toRaw(item); return mapped ? [mapped] : []; }));
    }
    return { source: this.source, startedAt, finishedAt: new Date().toISOString(), status: warnings.length ? "degraded" : "healthy", listings, warnings };
  }
}
