import type { RawListing } from "@/lib/domain/listing";

export type CollectorContext = {
  fetch: typeof globalThis.fetch;
  signal?: AbortSignal;
};

export type CollectorResult = {
  source: RawListing["source"];
  startedAt: string;
  finishedAt: string;
  status: "healthy" | "degraded" | "failed" | "disabled";
  listings: RawListing[];
  warnings: string[];
};

export interface Collector {
  source: RawListing["source"];
  collect(context: CollectorContext): Promise<CollectorResult>;
}
