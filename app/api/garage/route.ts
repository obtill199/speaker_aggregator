import { z } from "zod";

const stages = [
  "watching",
  "contacted",
  "purchased",
  "repairing",
  "keeping",
  "ready",
  "sold",
] as const;

const createGarageItem = z.object({
  id: z.string().min(1).max(160),
  listingId: z.string().min(1).max(160),
  title: z.string().min(1).max(500),
  stage: z.enum(stages).default("watching"),
  purchasePriceCents: z.number().int().nonnegative().nullable().default(null),
  partsCostCents: z.number().int().nonnegative().default(0),
  targetSaleCents: z.number().int().nonnegative().nullable().default(null),
});

const moveGarageItem = z.object({
  id: z.string().min(1).max(160),
  stage: z.enum(stages),
});

type GarageRow = {
  id: string;
  reference_key: string;
  title: string;
  stage: (typeof stages)[number];
  purchase_price_cents: number | null;
  parts_cost_cents: number;
  target_sale_cents: number | null;
};

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function GET() {
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare(
    `SELECT id, reference_key, title, stage, purchase_price_cents,
      parts_cost_cents, target_sale_cents
     FROM garage_items ORDER BY updated_at DESC`,
  ).all<GarageRow>();

  return Response.json({
    items: result.results.map((row) => ({
      id: row.id,
      listingId: row.reference_key,
      title: row.title,
      stage: row.stage,
      purchasePriceCents: row.purchase_price_cents,
      partsCostCents: row.parts_cost_cents,
      targetSaleCents: row.target_sale_cents,
    })),
  });
}

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  const parsed = createGarageItem.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid garage item.", 400);
  const item = parsed.data;
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO garage_items
      (id, reference_key, listing_id, title, stage, purchase_price_cents,
       parts_cost_cents, labor_hours, target_sale_cents, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(reference_key) DO UPDATE SET
       title = excluded.title,
       stage = excluded.stage,
       purchase_price_cents = excluded.purchase_price_cents,
       parts_cost_cents = excluded.parts_cost_cents,
       target_sale_cents = excluded.target_sale_cents,
       updated_at = excluded.updated_at`,
  )
    .bind(
      item.id,
      item.listingId,
      item.title,
      item.stage,
      item.purchasePriceCents,
      item.partsCostCents,
      item.targetSaleCents,
      now,
      now,
    )
    .run();

  return Response.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { env } = await import("cloudflare:workers");
  const parsed = moveGarageItem.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid stage update.", 400);

  const result = await env.DB.prepare(
    "UPDATE garage_items SET stage = ?, updated_at = ? WHERE id = ?",
  )
    .bind(parsed.data.stage, Date.now(), parsed.data.id)
    .run();
  if (!result.meta.changes) return jsonError("Garage item not found.", 404);
  return Response.json({ ok: true });
}
