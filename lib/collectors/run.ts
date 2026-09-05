import { deduplicateListings, normalizeListing } from "@/lib/domain/listing";
import type { Collector, CollectorResult } from "./types";

export async function runCollectors(
  collectors: Collector[],
  options: { fetch?: typeof globalThis.fetch; signal?: AbortSignal } = {},
) {
  const context = { fetch: options.fetch ?? globalThis.fetch, signal: options.signal };
  const settled = await Promise.allSettled(
    collectors.map(async (collector) => collector.collect(context)),
  );
  const results: CollectorResult[] = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const timestamp = new Date().toISOString();
    return {
      source: collectors[index].source,
      startedAt: timestamp,
      finishedAt: timestamp,
      status: "failed",
      listings: [],
      warnings: [result.reason instanceof Error ? result.reason.message : String(result.reason)],
    };
  });
  const listings = deduplicateListings(
    results.flatMap((result) => result.listings).map((listing) => normalizeListing(listing)),
  ).filter(
    (listing) =>
      !listing.excluded &&
      listing.source !== "estatesales" &&
      listing.category !== "estate-lead" &&
      Boolean(listing.brand) &&
      listing.isVintage,
  );
  return { listings, results };
}
