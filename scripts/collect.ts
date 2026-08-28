import { readFile } from "node:fs/promises";

import { sendGreatDealAlerts } from "../lib/alerts/pushover";
import { EbayCollector } from "../lib/collectors/ebay";
import { collectEbayComparables } from "../lib/collectors/ebay-comps";
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
  const comparableResult = await collectEbayComparables(output.listings);
  const ebayRun = output.results.find((result) => result.source === "ebay");
  if (ebayRun) ebayRun.warnings.push(...comparableResult.warnings);
  for (const result of output.results) {
    const note = result.warnings.length ? ` — ${result.warnings.join(" ")}` : "";
    console.log(`${result.source}: ${result.status}, ${result.listings.length} discovered${note}`);
  }

  const ingestUrl = process.env.SOUND_ROOM_INGEST_URL;
  const ingestKey = process.env.INGEST_KEY;
  let oidcToken = "";
  if (!ingestKey && process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    const tokenUrl = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
    tokenUrl.searchParams.set("audience", "the-sound-room");
    const tokenResponse = await fetch(tokenUrl, {
      headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
    });
    if (!tokenResponse.ok) throw new Error(`Could not obtain GitHub OIDC token (${tokenResponse.status}).`);
    oidcToken = ((await tokenResponse.json()) as { value: string }).value;
  }
  if (!ingestUrl || (!ingestKey && !oidcToken)) {
    console.log(`Dry run complete: ${output.listings.length} normalized matches. Add an ingest URL and local key, or run in GitHub Actions, to publish results.`);
    return;
  }

  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ingestKey ? { "X-Ingest-Key": ingestKey } : { Authorization: `Bearer ${oidcToken}` }),
    },
    body: JSON.stringify({ ...output, comparables: comparableResult.comparables }),
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
