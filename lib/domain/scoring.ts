import type { NormalizedListing } from "@/lib/domain/listing";

export type DealGrade =
  | "great"
  | "good"
  | "average"
  | "no-deal"
  | "bad"
  | "needs-review";
export type Confidence = "high" | "medium" | "low";

export type Comparable = {
  soldPriceCents: number;
  soldAt: string;
  modelMatch: "exact" | "family" | "category";
  condition?: string;
};

export type RepairRisk = {
  code: string;
  label: string;
  reserveCents: number;
  severity: "low" | "medium" | "high";
};

export type ScoreResult = {
  score: number | null;
  grade: DealGrade;
  confidence: Confidence;
  resaleLowCents: number | null;
  resaleHighCents: number | null;
  repairReserveCents: number;
  travelCostCents: number;
  allInCostCents: number | null;
  expectedProfitCents: number | null;
  components: {
    value: number;
    roi: number;
    demand: number;
    confidence: number;
  } | null;
  repairRisks: RepairRisk[];
  explanation: string[];
};

const RISK_RULES: Array<RepairRisk & { pattern: RegExp }> = [
  {
    code: "untested",
    label: "Untested / powers-on-only",
    pattern: /\buntested\b|powers? on|no way to test|as[ -]is/i,
    reserveCents: 12000,
    severity: "medium",
  },
  {
    code: "foam",
    label: "Foam surround work",
    pattern: /foam rot|rotted surround|needs? refoam|surrounds? gone/i,
    reserveCents: 9000,
    severity: "medium",
  },
  {
    code: "driver",
    label: "Dead or damaged driver",
    pattern: /dead tweeter|blown speaker|bad woofer|driver (?:is )?dead|no sound/i,
    reserveCents: 18000,
    severity: "high",
  },
  {
    code: "channel",
    label: "Channel / amplifier fault",
    pattern: /dead channel|one channel|cuts? out|intermittent|distortion/i,
    reserveCents: 22000,
    severity: "high",
  },
  {
    code: "hum",
    label: "Hum or power-supply service",
    pattern: /\bhum(?:ming)?\b|buzzing|filter caps?|needs? recap/i,
    reserveCents: 20000,
    severity: "high",
  },
  {
    code: "cosmetic",
    label: "Cabinet / veneer work",
    pattern: /veneer damage|water damage|cabinet damage|deep scratches|missing veneer/i,
    reserveCents: 10000,
    severity: "medium",
  },
  {
    code: "missing-parts",
    label: "Missing grille, knob, or badge",
    pattern: /missing grilles?|missing knobs?|missing badge|no grilles?/i,
    reserveCents: 6000,
    severity: "low",
  },
];

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return Math.round(sorted[lower] + (sorted[lower + 1] - sorted[lower]) * fraction);
}

export function extractRepairRisks(listing: Pick<NormalizedListing, "category" | "description" | "condition" | "title">) {
  const text = `${listing.title} ${listing.description} ${listing.condition ?? ""}`;
  const risks = RISK_RULES.filter((rule) => rule.pattern.test(text)).map((rule) => ({
    code: rule.code,
    label: rule.label,
    reserveCents: rule.reserveCents,
    severity: rule.severity,
  }));
  if (risks.length === 0 && !/restored|serviced|recapped|refoamed/i.test(text)) {
    risks.push({
      code: "baseline",
      label: listing.category === "receiver" ? "Basic receiver service reserve" : "Basic speaker service reserve",
      reserveCents: listing.category === "receiver" ? 9000 : 5000,
      severity: "low",
    });
  }
  return risks;
}

function confidenceFor(comparables: Comparable[]): Confidence {
  const exact = comparables.filter((comp) => comp.modelMatch === "exact").length;
  if (exact >= 4 && comparables.length >= 5) return "high";
  if (exact >= 2 || comparables.length >= 4) return "medium";
  return "low";
}

function gradeFor(score: number): Exclude<DealGrade, "needs-review"> {
  if (score >= 80) return "great";
  if (score >= 65) return "good";
  if (score >= 45) return "average";
  if (score >= 25) return "no-deal";
  return "bad";
}

export function scoreListing(
  listing: NormalizedListing,
  comparables: Comparable[],
  options: { costPerMileCents?: number; sellingFeeRate?: number } = {},
): ScoreResult {
  const costPerMileCents = options.costPerMileCents ?? 35;
  const sellingFeeRate = options.sellingFeeRate ?? 0.13;
  const repairRisks = extractRepairRisks(listing);
  const repairReserveCents = repairRisks.reduce((total, risk) => total + risk.reserveCents, 0);
  const travelCostCents = Math.round((listing.distanceMiles ?? 0) * 2 * costPerMileCents);
  const confidence = confidenceFor(comparables);
  const usableComps = comparables.filter(
    (comparable) => Number.isFinite(comparable.soldPriceCents) && comparable.soldPriceCents > 0,
  );

  if (listing.priceCents === null || usableComps.length === 0) {
    return {
      score: null,
      grade: "needs-review",
      confidence,
      resaleLowCents: null,
      resaleHighCents: null,
      repairReserveCents,
      travelCostCents,
      allInCostCents: null,
      expectedProfitCents: null,
      components: null,
      repairRisks,
      explanation: [
        listing.priceCents === null ? "The listing has no usable asking price." : "No asking-price issue found.",
        usableComps.length === 0
          ? "No credible sold comparables are available."
          : `${usableComps.length} sold comparables are available.`,
      ],
    };
  }

  const prices = usableComps.map((comparable) => comparable.soldPriceCents);
  const resaleLowCents = percentile(prices, 0.25);
  const resaleHighCents = percentile(prices, 0.75);
  const allInCostCents =
    listing.priceCents + listing.shippingCents + repairReserveCents + travelCostCents;
  const expectedNetResaleCents = Math.round(resaleLowCents * (1 - sellingFeeRate));
  const expectedProfitCents = expectedNetResaleCents - allInCostCents;
  const discount = (resaleLowCents - allInCostCents) / resaleLowCents;
  const roi = expectedProfitCents / Math.max(allInCostCents, 1);
  const valueComponent = clamp(((discount + 0.15) / 0.75) * 100);
  const roiComponent = clamp(((roi + 0.1) / 1.1) * 100);
  const recentCutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const recentCount = usableComps.filter(
    (comparable) => new Date(comparable.soldAt).getTime() >= recentCutoff,
  ).length;
  const demandComponent = clamp(30 + usableComps.length * 8 + recentCount * 5);
  const confidenceComponent = confidence === "high" ? 100 : confidence === "medium" ? 65 : 35;
  const score = Math.round(
    valueComponent * 0.45 +
      roiComponent * 0.25 +
      demandComponent * 0.15 +
      confidenceComponent * 0.15,
  );
  return {
    score,
    grade: gradeFor(score),
    confidence,
    resaleLowCents,
    resaleHighCents,
    repairReserveCents,
    travelCostCents,
    allInCostCents,
    expectedProfitCents,
    components: {
      value: Math.round(valueComponent),
      roi: Math.round(roiComponent),
      demand: Math.round(demandComponent),
      confidence: confidenceComponent,
    },
    repairRisks,
    explanation: [
      `Uses the lower-quartile sold value of $${(resaleLowCents / 100).toFixed(0)}.`,
      `Includes $${(repairReserveCents / 100).toFixed(0)} in repair reserve and $${(
        travelCostCents / 100
      ).toFixed(0)} in travel.`,
      `Estimated conservative net profit is $${(expectedProfitCents / 100).toFixed(0)} after selling fees.`,
    ],
  };
}
