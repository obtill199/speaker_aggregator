import { z } from "zod";

import { verifyGitHubCollectorToken } from "@/lib/auth/github-oidc";
import { sameSecret } from "@/lib/auth/shared-secret";
import { scoreListing } from "@/lib/domain/scoring";

const listingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["ebay", "facebook", "reverb", "estatesales", "usaudiomart", "manual"]),
  sourceListingId: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  normalizedTitle: z.string(),
  description: z.string().default(""),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.enum(["speaker", "receiver", "estate-lead"]),
  priceCents: z.number().int().nonnegative().nullable(),
  shippingCents: z.number().int().nonnegative(),
  location: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  distanceMiles: z.number().nonnegative().nullable(),
  condition: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  postedAt: z.string().nullable(),
  isVintage: z.boolean(),
  excluded: z.boolean(),
  exclusionReason: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  sourcePayload: z.string().nullable(),
});

const runSchema = z.object({
  source: z.string().min(1),
  startedAt: z.string(),
  finishedAt: z.string(),
  status: z.enum(["healthy", "degraded", "failed", "disabled"]),
  listings: z.array(z.unknown()).default([]),
  warnings: z.array(z.string()).default([]),
});

const ingestSchema = z.object({
  listings: z.array(listingSchema).max(1000),
  results: z.array(runSchema).max(30),
  comparables: z.record(
    z.string(),
    z.array(z.object({
      soldPriceCents: z.number().int().positive(),
      soldAt: z.string(),
      modelMatch: z.enum(["exact", "family", "category"]),
      condition: z.string().optional(),
    })).max(50),
  ).default({}),
});

async function authorized(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    try {
      if (await verifyGitHubCollectorToken(bearer)) return true;
    } catch {
      // A failed key fetch or signature check falls through to the local bridge key.
    }
  }
  return sameSecret(request.headers.get("x-ingest-key"), process.env.INGEST_KEY);
}

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  if (!(await authorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ingestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid collector payload", issues: parsed.error.issues }, { status: 400 });
  }

  const scored = parsed.data.listings.map((listing) => ({
    listing,
    score: scoreListing(listing, parsed.data.comparables[listing.id] ?? []),
  }));
  const existing = scored.length
    ? await env.DB.batch(
        scored.map(({ listing }) =>
          env.DB.prepare("SELECT id FROM listings WHERE id = ?").bind(listing.id),
        ),
      )
    : [];
  const newIds = new Set(
    scored
      .filter((_, index) => (existing[index]?.results?.length ?? 0) === 0)
      .map(({ listing }) => listing.id),
  );

  const listingWrites = scored.map(({ listing, score }) =>
    env.DB.prepare(
      `INSERT INTO listings
       (id, source, source_listing_id, url, title, brand, model, category,
        price_cents, shipping_cents, location, latitude, longitude, distance_miles,
        condition, description, image_url, posted_at, first_seen_at, last_seen_at,
        status, is_vintage, deal_score, deal_grade, confidence,
        estimated_value_low_cents, estimated_value_high_cents,
        estimated_repair_cents, estimated_profit_cents, risk_flags, source_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source, source_listing_id) DO UPDATE SET
        url = excluded.url, title = excluded.title, price_cents = excluded.price_cents,
        shipping_cents = excluded.shipping_cents, location = excluded.location,
        condition = excluded.condition, description = excluded.description,
        image_url = excluded.image_url, last_seen_at = excluded.last_seen_at,
        status = 'active', deal_score = excluded.deal_score,
        deal_grade = excluded.deal_grade, confidence = excluded.confidence,
        estimated_value_low_cents = excluded.estimated_value_low_cents,
        estimated_value_high_cents = excluded.estimated_value_high_cents,
        estimated_repair_cents = excluded.estimated_repair_cents,
        estimated_profit_cents = excluded.estimated_profit_cents,
        risk_flags = excluded.risk_flags, source_payload = excluded.source_payload`,
    ).bind(
      listing.id,
      listing.source,
      listing.sourceListingId,
      listing.url,
      listing.title,
      listing.brand,
      listing.model,
      listing.category,
      listing.priceCents,
      listing.shippingCents,
      listing.location,
      listing.latitude,
      listing.longitude,
      listing.distanceMiles,
      listing.condition,
      listing.description,
      listing.imageUrl,
      listing.postedAt ? Date.parse(listing.postedAt) : null,
      Date.parse(listing.firstSeenAt),
      Date.parse(listing.lastSeenAt),
      listing.isVintage ? 1 : 0,
      score.score,
      score.grade,
      score.confidence,
      score.resaleLowCents,
      score.resaleHighCents,
      score.repairReserveCents,
      score.expectedProfitCents,
      JSON.stringify(score.repairRisks),
      JSON.stringify({ sourcePayload: listing.sourcePayload, score }),
    ),
  );

  const runWrites = parsed.data.results.map((run) =>
    env.DB.prepare(
      `INSERT INTO collector_runs
       (id, source, started_at, finished_at, status, discovered_count, upserted_count, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      `run_${crypto.randomUUID()}`,
      run.source,
      Date.parse(run.startedAt),
      Date.parse(run.finishedAt),
      run.status === "disabled" ? "degraded" : run.status,
      run.listings.length,
      scored.filter(({ listing }) => listing.source === run.source).length,
      run.warnings.join(" ") || null,
    ),
  );

  if (listingWrites.length || runWrites.length) {
    await env.DB.batch([...listingWrites, ...runWrites]);
  }

  const greatDeals = scored
    .filter(({ listing, score }) => newIds.has(listing.id) && score.grade === "great")
    .map(({ listing, score }) => ({ id: listing.id, title: listing.title, url: listing.url, score: score.score }));

  return Response.json({ accepted: scored.length, newListings: newIds.size, greatDeals });
}
