import { readFile } from "node:fs/promises";

import { sendGreatDealAlerts } from "../lib/alerts/pushover";
import { EbayCollector } from "../lib/collectors/ebay";
import { ManualCollector } from "../lib/collectors/manual";
import { ReverbCollector } from "../lib/collectors/reverb";
import { runCollectors } from "../lib/collectors/run";
import type { Collector } from "../lib/collectors/types";
import type { RawListing } from "../lib/domain/listing";

async function importedListings() {
  const path = process.env.FACEBOOK_IMPORT_PATH;
  if (!path) return [];
  const payload = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!Array.isArray(payload)) throw new Error("FACEBOOK_IMPORT_PATH must contain a JSON array.");
  return payload as RawListing[];
}

async function main() {
  const collectors: Collector[] = [new EbayCollector(), new ReverbCollector()];
  const imported = await importedListings();
  if (imported.length) collectors.push(new ManualCollector(imported));

  const output = await runCollectors(collectors);
  for (const result of output.results) {
    const note = result.warnings.length ? ` — ${result.warnings.join(" ")}` : "";
    console.log(`${result.source}: ${result.status}, ${result.listings.length} discovered${note}`);
  }

  const ingestUrl = process.env.SOUND_ROOM_INGEST_URL;
  const ingestKey = process.env.INGEST_KEY;
  if (!ingestUrl || !ingestKey) {
    console.log(`Dry run complete: ${output.listings.length} normalized matches. Add SOUND_ROOM_INGEST_URL and INGEST_KEY to publish results.`);
    return;
  }

  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ingest-Key": ingestKey },
    body: JSON.stringify(output),
  });
  if (!response.ok) throw new Error(`Ingest failed (${response.status}): ${await response.text()}`);
  const result = (await response.json()) as {
    accepted: number;
    newListings: number;
    greatDeals: Array<{ title: string; url: string; score: number | null }>;
  };
  const alerts = await sendGreatDealAlerts(result.greatDeals);
  console.log(`Published ${result.accepted} matches (${result.newListings} new); sent ${alerts.sent} Great Deal alerts.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
