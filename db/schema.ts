import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    sourceListingId: text("source_listing_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    brand: text("brand"),
    model: text("model"),
    category: text("category", { enum: ["speaker", "receiver", "estate-lead"] })
      .notNull()
      .default("speaker"),
    priceCents: integer("price_cents"),
    shippingCents: integer("shipping_cents").notNull().default(0),
    location: text("location"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    distanceMiles: real("distance_miles"),
    condition: text("condition"),
    description: text("description"),
    imageUrl: text("image_url"),
    postedAt: integer("posted_at", { mode: "timestamp_ms" }),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: ["active", "ended", "sold", "ignored"] })
      .notNull()
      .default("active"),
    isVintage: integer("is_vintage", { mode: "boolean" }).notNull().default(true),
    dealScore: real("deal_score"),
    dealGrade: text("deal_grade", {
      enum: ["great", "good", "average", "no-deal", "bad", "needs-review"],
    }),
    confidence: text("confidence", { enum: ["high", "medium", "low"] }),
    estimatedValueLowCents: integer("estimated_value_low_cents"),
    estimatedValueHighCents: integer("estimated_value_high_cents"),
    estimatedRepairCents: integer("estimated_repair_cents").notNull().default(0),
    estimatedProfitCents: integer("estimated_profit_cents"),
    riskFlags: text("risk_flags").notNull().default("[]"),
    sourcePayload: text("source_payload"),
  },
  (table) => [
    uniqueIndex("listings_source_listing_unique").on(
      table.source,
      table.sourceListingId,
    ),
    index("listings_deal_score_idx").on(table.dealScore),
    index("listings_last_seen_idx").on(table.lastSeenAt),
    index("listings_brand_category_idx").on(table.brand, table.category),
  ],
);

export const collectorRuns = sqliteTable(
  "collector_runs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["running", "healthy", "degraded", "failed"] })
      .notNull()
      .default("running"),
    discoveredCount: integer("discovered_count").notNull().default(0),
    upsertedCount: integer("upserted_count").notNull().default(0),
    errorMessage: text("error_message"),
  },
  (table) => [index("collector_runs_source_started_idx").on(table.source, table.startedAt)],
);

export const garageItems = sqliteTable(
  "garage_items",
  {
    id: text("id").primaryKey(),
    referenceKey: text("reference_key").notNull().default(""),
    listingId: text("listing_id").references(() => listings.id),
    title: text("title").notNull(),
    stage: text("stage", {
      enum: ["watching", "contacted", "purchased", "repairing", "keeping", "ready", "sold"],
    })
      .notNull()
      .default("watching"),
    purchasePriceCents: integer("purchase_price_cents"),
    partsCostCents: integer("parts_cost_cents").notNull().default(0),
    laborHours: real("labor_hours").notNull().default(0),
    targetSaleCents: integer("target_sale_cents"),
    soldPriceCents: integer("sold_price_cents"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("garage_reference_unique").on(table.referenceKey),
    uniqueIndex("garage_listing_unique").on(table.listingId),
    index("garage_stage_idx").on(table.stage),
  ],
);

export const watchRules = sqliteTable("watch_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["speaker", "receiver"] }).notNull(),
  brand: text("brand").notNull(),
  aliases: text("aliases").notNull().default("[]"),
  maxPriceCents: integer("max_price_cents"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
