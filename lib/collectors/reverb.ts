import type { Collector, CollectorResult } from "./types";

export class ReverbCollector implements Collector {
  source = "reverb" as const;

  async collect(): Promise<CollectorResult> {
    const timestamp = new Date().toISOString();
    const enabled = process.env.REVERB_ENABLED === "true";
    if (!enabled) {
      return {
        source: this.source,
        startedAt: timestamp,
        finishedAt: timestamp,
        status: "disabled",
        listings: [],
        warnings: [
          "Reverb is intentionally disabled until API authorization covers automated valuation.",
        ],
      };
    }
    if (!process.env.REVERB_TOKEN) {
      return {
        source: this.source,
        startedAt: timestamp,
        finishedAt: timestamp,
        status: "failed",
        listings: [],
        warnings: ["REVERB_ENABLED is true but REVERB_TOKEN is missing."],
      };
    }
    return {
      source: this.source,
      startedAt: timestamp,
      finishedAt: timestamp,
      status: "degraded",
      listings: [],
      warnings: ["Reverb permission is configured; listing mapping remains behind the compliance gate."],
    };
  }
}
