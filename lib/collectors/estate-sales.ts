import type { RawListing } from "@/lib/domain/listing";
import type { Collector, CollectorContext, CollectorResult } from "./types";

type WrappedDate = { _value?: string } | null;
type SaleRow = {
  id: number;
  name?: string;
  orgName?: string;
  cityName?: string;
  stateCode?: string;
  postalCodeNumber?: string;
  latitude?: number;
  longitude?: number;
  typeName?: string;
  pictureCount?: number;
  itemCount?: number;
  utcDateFirstPublished?: WrappedDate;
  firstUtcStartDate?: WrappedDate;
  lastUtcEndDate?: WrappedDate;
  mainPicture?: { thumbnailUrl?: string; url?: string } | null;
};

const SEARCH_ROUTES = [
  "KS/Udall/67146",
  "KS/Salina/67401",
  "KS/Topeka/66603",
  "MO/Kansas-City/64106",
  "MO/Joplin/64801",
  "OK/Tulsa/74103",
  "OK/Oklahoma-City/73102",
] as const;

export function parseEstateSalePage(html: string): RawListing[] {
  const match = html.match(/<script id="estatesales-net-state" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("EstateSales.net did not include its public sale summary data.");
  const state = JSON.parse(match[1]) as { NGRX_STATE?: { ui?: { sales?: { saleRows?: Record<string, SaleRow> } } } };
  const rows = Object.values(state.NGRX_STATE?.ui?.sales?.saleRows ?? {});
  return rows.map((sale) => ({
    source: "estatesales",
    sourceListingId: String(sale.id),
    url: `https://www.estatesales.net/${sale.stateCode ?? "KS"}/${encodeURIComponent(sale.cityName ?? "Sale").replace(/%20/g, "-")}/${sale.postalCodeNumber ?? ""}/${sale.id}`,
    title: `Estate sale: ${sale.name ?? sale.orgName ?? `Sale ${sale.id}`}`,
    description: [sale.typeName, `${sale.pictureCount ?? 0} photos`, sale.itemCount ? `${sale.itemCount} listed items` : null, sale.firstUtcStartDate?._value && `Starts ${sale.firstUtcStartDate._value}`, sale.lastUtcEndDate?._value && `Ends ${sale.lastUtcEndDate._value}`].filter(Boolean).join(" · "),
    priceCents: null,
    shippingCents: 0,
    location: [sale.cityName, sale.stateCode, sale.postalCodeNumber].filter(Boolean).join(", "),
    latitude: sale.latitude,
    longitude: sale.longitude,
    condition: "Estate sale lead — inspect photos and description",
    imageUrl: sale.mainPicture?.thumbnailUrl ?? sale.mainPicture?.url,
    postedAt: sale.utcDateFirstPublished?._value,
    raw: sale,
  }));
}

export class EstateSalesCollector implements Collector {
  source = "estatesales" as const;

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const startedAt = new Date().toISOString();
    const settled = await Promise.allSettled(SEARCH_ROUTES.map(async (route) => {
      const response = await context.fetch(`https://www.estatesales.net/${route}`, {
        headers: { Accept: "text/html", "User-Agent": "TheSoundRoom/1.0 (+https://github.com/obtill199/speaker_aggregator)" },
        signal: context.signal,
      });
      if (!response.ok) throw new Error(`${route} returned ${response.status}`);
      return parseEstateSalePage(await response.text());
    }));
    const listings = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const warnings = settled.flatMap((result) => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []);
    return { source: this.source, startedAt, finishedAt: new Date().toISOString(), status: warnings.length ? "degraded" : "healthy", listings, warnings };
  }
}
