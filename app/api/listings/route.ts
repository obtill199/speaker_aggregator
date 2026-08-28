import { DEMO_LISTINGS } from "@/lib/data/demo";
import type { ScoreResult } from "@/lib/domain/scoring";

type ListingRow = {
  id: string;
  source: string;
  source_listing_id: string;
  url: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: "speaker" | "receiver" | "estate-lead";
  price_cents: number | null;
  shipping_cents: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number | null;
  condition: string | null;
  description: string | null;
  image_url: string | null;
  posted_at: number | null;
  first_seen_at: number;
  last_seen_at: number;
  is_vintage: number;
  deal_score: number | null;
  deal_grade: ScoreResult["grade"] | null;
  confidence: ScoreResult["confidence"] | null;
  estimated_value_low_cents: number | null;
  estimated_value_high_cents: number | null;
  estimated_repair_cents: number;
  estimated_profit_cents: number | null;
  risk_flags: string;
  source_payload: string | null;
};

function storedScore(row: ListingRow): ScoreResult {
  if (row.source_payload) {
    try {
      const payload = JSON.parse(row.source_payload) as { score?: ScoreResult };
      if (payload.score) return payload.score;
    } catch {
      // Old payloads fall through to a conservative summary.
    }
  }
  return {
    score: row.deal_score,
    grade: row.deal_grade ?? "needs-review",
    confidence: row.confidence ?? "low",
    resaleLowCents: row.estimated_value_low_cents,
    resaleHighCents: row.estimated_value_high_cents,
    repairReserveCents: row.estimated_repair_cents,
    travelCostCents: 0,
    allInCostCents: null,
    expectedProfitCents: row.estimated_profit_cents,
    components: null,
    repairRisks: JSON.parse(row.risk_flags || "[]"),
    explanation: ["This record predates the current explainable score format."],
  };
}

export async function GET() {
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare(
    `SELECT * FROM listings WHERE status = 'active'
     ORDER BY COALESCE(deal_score, -1) DESC, last_seen_at DESC LIMIT 500`,
  ).all<ListingRow>();

  if (!result.results.length) {
    return Response.json({ mode: "demo", items: DEMO_LISTINGS });
  }

  return Response.json({
    mode: "live",
    items: result.results.map((row, index) => ({
      id: row.id,
      source: row.source,
      sourceListingId: row.source_listing_id,
      url: row.url,
      title: row.title,
      normalizedTitle: row.title.toLowerCase(),
      description: row.description ?? "",
      brand: row.brand,
      model: row.model,
      category: row.category,
      priceCents: row.price_cents,
      shippingCents: row.shipping_cents,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceMiles: row.distance_miles,
      condition: row.condition,
      imageUrl: row.image_url,
      postedAt: row.posted_at ? new Date(row.posted_at).toISOString() : null,
      isVintage: Boolean(row.is_vintage),
      excluded: false,
      exclusionReason: null,
      firstSeenAt: new Date(row.first_seen_at).toISOString(),
      lastSeenAt: new Date(row.last_seen_at).toISOString(),
      sourcePayload: null,
      score: storedScore(row),
      demoOrder: index,
    })),
  });
}
