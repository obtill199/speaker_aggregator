import type { RawListing } from "@/lib/domain/listing";
import type { Collector, CollectorResult } from "./types";

export class ManualCollector implements Collector {
  source = "manual" as const;

  constructor(private readonly seedListings: RawListing[]) {}

  async collect(): Promise<CollectorResult> {
    const startedAt = new Date().toISOString();
    return {
      source: this.source,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "healthy",
      listings: this.seedListings,
      warnings: [],
    };
  }
}
