import { readFile } from "node:fs/promises";

import { sendGreatDealAlerts } from "../lib/alerts/pushover";
import { EbayCollector } from "../lib/collectors/ebay";
import { EstateSalesCollector } from "../lib/collectors/estate-sales";
import { ManualCollector } from "../lib/collectors/manual";
import { ReverbCollector } from "../lib/collectors/reverb";
import { runCollectors } from "../lib/collectors/run";
import type { Collector } from "../lib/collectors/types";
import type { RawListing } from "../lib/domain/listing";
import type { Comparable } from "../lib/domain/scoring";

async function importedListings() {
  const path = process.env.FACEBOOK_IMPORT_PATH;
  if (!path) return [];
  const payload = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!Array.isArray(payload)) throw new Error("FACEBOOK_IMPORT_PATH must contain a JSON array.");
  return payload as RawListing[];
}

async function importedComparables() {
  const path = process.env.COMPARABLES_IMPORT_PATH;
  if (!path) return {};
  const payload = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("COMPARABLES_IMPORT_PATH must contain an object keyed by normalized listing ID.");
  }
  return payload as Record<string, Comparable[]>;
}

async function githubIdentityToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) return null;
  const url = new URL(requestUrl);
  url.searchParams.set("audience", "the-sound-room");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}` },
  });
  if (!response.ok) throw new Error(`GitHub identity token request failed (${response.status}).`);
  const payload = (await response.json()) as { value?: string };
  if (!payload.value) throw new Error("GitHub identity token response did not contain a token.");
  return payload.value;
}

async function main() {
  const collectors: Collector[] = [
    new EbayCollector(),
    new ReverbCollector(),
    new EstateSalesCollector(),
  ];
  const imported = await importedListings();
  if (imported.length) collectors.push(new ManualCollector(imported));

  const output = await runCollectors(collectors);
  const comparables = await importedComparables();
  for (const result of output.results) {
    const note = result.warnings.length ? ` — ${result.warnings.join(" ")}` : "";
    console.log(`${result.source}: ${result.status}, ${result.listings.length} discovered${note}`);
  }

  const ingestUrl = process.env.SOUND_ROOM_INGEST_URL;
  const ingestKey = process.env.INGEST_KEY;
  if (!ingestUrl) {
    console.log(`Dry run complete: ${output.listings.length} normalized matches. Add SOUND_ROOM_INGEST_URL to publish results.`);
    return;
  }

  const identityToken = await githubIdentityToken();
  if (!identityToken && !ingestKey) {
    console.log(`Dry run complete: ${output.listings.length} normalized matches. Run in GitHub Actions or add INGEST_KEY for a local publish.`);
    return;
  }

  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(identityToken ? { Authorization: `Bearer ${identityToken}` } : { "X-Ingest-Key": ingestKey! }),
    },
    body: JSON.stringify({ ...output, comparables }),
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
