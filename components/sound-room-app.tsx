"use client";

import {
  Bookmark,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Gauge,
  ListFilter,
  MapPin,
  Radar,
  Radio,
  Search,
  Warehouse,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEARCH_CENTER, SOURCE_LABELS } from "@/lib/config";
import { cn } from "@/lib/utils";

type DemoListing = (typeof import("@/lib/data/demo"))["DEMO_LISTINGS"][number];
type GradeFilter = "all" | DemoListing["score"]["grade"];
type ViewName = "new" | "all" | "map" | "garage";
type GarageStage =
  | "watching"
  | "contacted"
  | "purchased"
  | "repairing"
  | "keeping"
  | "ready"
  | "sold";

type GarageItem = {
  id: string;
  listingId: string;
  title: string;
  stage: GarageStage;
  purchasePriceCents: number | null;
  partsCostCents: number;
  targetSaleCents: number | null;
};

type SourceHealth = {
  source: string;
  status: "healthy" | "degraded" | "failed" | "disabled" | "setup";
  label: string;
  finishedAt?: string | null;
};

const gradeLabels = {
  great: "Great Deal",
  good: "Good Deal",
  average: "Average",
  "no-deal": "No Deal",
  bad: "Bad Deal",
  "needs-review": "Needs Review",
} as const;

const stageLabels: Record<GarageStage, string> = {
  watching: "Watching",
  contacted: "Contacted",
  purchased: "Purchased",
  repairing: "Repairing",
  keeping: "Keeping",
  ready: "Ready to Sell",
  sold: "Sold",
};

const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined
    ? "Unpriced"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(cents / 100);

const sourceLabel = (source: string) =>
  SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source;

function EquipmentIllustration({ category, brand }: { category: string; brand: string | null }) {
  if (category === "receiver" || category === "estate-lead") {
    return (
      <div className="equipment receiver-art" aria-hidden="true">
        <div className="receiver-window"><span /></div>
        <div className="receiver-knobs"><i /><i /><i /><i /></div>
        <b>{brand ?? "ESTATE"}</b>
      </div>
    );
  }
  return (
    <div className="equipment speaker-art" aria-hidden="true">
      <div className="speaker-driver speaker-driver-small" />
      <div className="speaker-driver speaker-driver-large" />
      <b>{brand ?? "AUDIO"}</b>
    </div>
  );
}

function GradeBadge({ listing, large = false }: { listing: DemoListing; large?: boolean }) {
  const { grade, score } = listing.score;
  return (
    <div className={cn("grade-badge", `grade-${grade}`, large && "grade-badge-large")}>
      <span>{gradeLabels[grade]}</span>
      <strong>{score ?? "—"}</strong>
    </div>
  );
}

function ListingCard({ listing, onInspect }: { listing: DemoListing; onInspect: () => void }) {
  return (
    <article className="listing-card">
      <button className="listing-card-visual" onClick={onInspect} aria-label={`Inspect ${listing.title}`}>
        <EquipmentIllustration category={listing.category} brand={listing.brand} />
        <span className="source-flag">{sourceLabel(listing.source)}</span>
      </button>
      <div className="listing-card-body">
        <div className="listing-card-topline">
          <GradeBadge listing={listing} />
          <span className="confidence">{listing.score.confidence} confidence</span>
        </div>
        <button className="listing-title" onClick={onInspect}>{listing.title}</button>
        <div className="listing-price-row">
          <strong>{money(listing.priceCents)}</strong>
          <span>{listing.distanceMiles !== null ? `${listing.distanceMiles} mi` : "Shippable"}</span>
        </div>
        <div className="listing-meta">
          <span><MapPin /> {listing.location ?? "Location unavailable"}</span>
          <span><Clock3 /> {listing.postedAt ? "Recently listed" : "Date unknown"}</span>
        </div>
        <div className="listing-value-row">
          <span>Conservative value</span>
          <strong>
            {listing.score.resaleLowCents === null
              ? "Review photos"
              : `${money(listing.score.resaleLowCents)}–${money(listing.score.resaleHighCents)}`}
          </strong>
        </div>
        <Button className="inspect-button" onClick={onInspect}>Inspect deal</Button>
      </div>
    </article>
  );
}

function DetailSheet({
  listing,
  open,
  onOpenChange,
  onSave,
  saved,
}: {
  listing: DemoListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (listing: DemoListing) => void;
  saved: boolean;
}) {
  if (!listing) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="detail-sheet sm:max-w-xl">
        <SheetHeader className="detail-sheet-header">
          <div className="detail-source">{sourceLabel(listing.source)} · {listing.location}</div>
          <SheetTitle>{listing.title}</SheetTitle>
          <SheetDescription>{listing.description}</SheetDescription>
        </SheetHeader>
        <div className="detail-scroll">
          <div className="detail-score-panel">
            <GradeBadge listing={listing} large />
            <div>
              <span className="detail-label">Asking price</span>
              <strong className="detail-price">{money(listing.priceCents)}</strong>
              <p>{listing.score.confidence} confidence · {listing.distanceMiles ?? "—"} miles</p>
            </div>
          </div>

          {listing.score.components ? (
            <section className="detail-section">
              <h3>Why it scored this way</h3>
              {Object.entries(listing.score.components).map(([label, value]) => (
                <div className="score-component" key={label}>
                  <div><span>{label}</span><strong>{value}/100</strong></div>
                  <Progress value={value} className="score-progress" />
                </div>
              ))}
            </section>
          ) : (
            <section className="review-callout">
              <strong>Manual review required</strong>
              <p>This lead is missing a price or enough comparable sales for a defensible score.</p>
            </section>
          )}

          <section className="detail-section detail-numbers">
            <h3>Conservative economics</h3>
            <dl>
              <div><dt>Value range</dt><dd>{listing.score.resaleLowCents ? `${money(listing.score.resaleLowCents)}–${money(listing.score.resaleHighCents)}` : "Unknown"}</dd></div>
              <div><dt>Repair reserve</dt><dd>{money(listing.score.repairReserveCents)}</dd></div>
              <div><dt>Round-trip travel</dt><dd>{money(listing.score.travelCostCents)}</dd></div>
              <div><dt>All-in estimate</dt><dd>{money(listing.score.allInCostCents)}</dd></div>
              <div className="profit-row"><dt>Conservative profit</dt><dd>{money(listing.score.expectedProfitCents)}</dd></div>
            </dl>
          </section>

          <section className="detail-section">
            <h3>Repair watchlist</h3>
            <div className="risk-list">
              {listing.score.repairRisks.map((risk) => (
                <div key={risk.code} className={`risk risk-${risk.severity}`}>
                  <Wrench /><span>{risk.label}</span><strong>{money(risk.reserveCents)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section explanation-list">
            <h3>Audit trail</h3>
            <ul>{listing.score.explanation.map((line) => <li key={line}>{line}</li>)}</ul>
          </section>
        </div>
        <SheetFooter className="detail-footer">
          <Button variant="outline" onClick={() => onSave(listing)} disabled={saved}>
            <Bookmark /> {saved ? "Saved to Garage" : "Save to Garage"}
          </Button>
          <Button asChild>
            <a href={listing.url} target="_blank" rel="noreferrer">Open original <ExternalLink /></a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RadarMap({ listings, onInspect }: { listings: DemoListing[]; onInspect: (listing: DemoListing) => void }) {
  return (
    <div className="map-layout">
      <div className="radar-map" aria-label="Listing locations within 250 miles of Udall, Kansas">
        <div className="radar-ring radar-ring-250" /><div className="radar-ring radar-ring-125" />
        <div className="radar-cross radar-cross-x" /><div className="radar-cross radar-cross-y" />
        <div className="map-center"><Radar /><span>Udall</span></div>
        {listings.filter((listing) => listing.latitude !== null && listing.longitude !== null).map((listing) => {
          const left = 50 + ((listing.longitude! - SEARCH_CENTER.longitude) / 4.1) * 42;
          const top = 50 - ((listing.latitude! - SEARCH_CENTER.latitude) / 3.6) * 42;
          return (
            <button
              key={listing.id}
              className={`map-pin grade-${listing.score.grade}`}
              style={{ left: `${Math.max(5, Math.min(95, left))}%`, top: `${Math.max(5, Math.min(95, top))}%` }}
              onClick={() => onInspect(listing)}
              aria-label={`${listing.title}, ${listing.distanceMiles} miles away`}
            >
              <MapPin /><span>{listing.brand ?? "Estate"}</span>
            </button>
          );
        })}
      </div>
      <aside className="map-legend">
        <span className="eyebrow">250-mile listening radius</span>
        <h2>Local opportunities</h2>
        <p>Click a marker to inspect the deal. Shippable-only listings stay in the list view.</p>
        <div className="map-stat"><strong>{listings.filter((item) => item.distanceMiles !== null).length}</strong><span>mapped listings</span></div>
        <div className="map-stat"><strong>{listings.filter((item) => item.score.grade === "great").length}</strong><span>great deals</span></div>
      </aside>
    </div>
  );
}

function GarageBoard({ items, listings, onMove }: { items: GarageItem[]; listings: DemoListing[]; onMove: (item: GarageItem, stage: GarageStage) => void }) {
  const visibleStages: GarageStage[] = ["watching", "contacted", "purchased", "repairing", "ready", "sold"];
  return (
    <div className="garage-board">
      {visibleStages.map((stage) => (
        <section className="garage-column" key={stage}>
          <header><span className="status-lamp" />{stageLabels[stage]}<strong>{items.filter((item) => item.stage === stage).length}</strong></header>
          <div className="garage-stack">
            {items.filter((item) => item.stage === stage).map((item) => {
              const listing = listings.find((entry) => entry.id === item.listingId);
              const currentIndex = visibleStages.indexOf(stage);
              return (
                <article className="garage-card" key={item.id}>
                  <span>{listing?.brand ?? "Audio"}</span>
                  <h3>{item.title}</h3>
                  <dl><div><dt>Paid</dt><dd>{money(item.purchasePriceCents)}</dd></div><div><dt>Target</dt><dd>{money(item.targetSaleCents)}</dd></div></dl>
                  {currentIndex < visibleStages.length - 1 && (
                    <Button size="sm" variant="outline" onClick={() => onMove(item, visibleStages[currentIndex + 1])}>
                      Move to {stageLabels[visibleStages[currentIndex + 1]]}
                    </Button>
                  )}
                </article>
              );
            })}
            {items.every((item) => item.stage !== stage) && <p className="garage-empty">No equipment here yet.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SoundRoomApp({ initialListings }: { initialListings: DemoListing[] }) {
  const [listings, setListings] = useState<DemoListing[]>(initialListings);
  const [view, setView] = useState<ViewName>("new");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<GradeFilter>("all");
  const [brand, setBrand] = useState("all");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<DemoListing | null>(null);
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [garageKey, setGarageKey] = useState("");
  const [garageKeyDraft, setGarageKeyDraft] = useState("");
  const [garageError, setGarageError] = useState("");
  const [lastScan, setLastScan] = useState("Checking…");
  const [inventoryMode, setInventoryMode] = useState<"demo" | "live">("demo");
  const [sourceHealth, setSourceHealth] = useState<SourceHealth[]>([
    { source: "ebay", status: "setup", label: "Add keys" },
    { source: "facebook", status: "setup", label: "Setup" },
    { source: "reverb", status: "disabled", label: "Permission" },
    { source: "manual", status: "healthy", label: "Ready" },
  ]);

  useEffect(() => {
    const savedGarageKey = window.localStorage.getItem("sound-room-garage-key") ?? "";
    if (savedGarageKey) queueMicrotask(() => setGarageKey(savedGarageKey));
    Promise.allSettled([
      fetch("/api/listings").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/api/health").then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([listingResult, healthResult]) => {
      if (listingResult.status === "fulfilled" && listingResult.value.items?.length) {
        setListings(listingResult.value.items);
        setInventoryMode(listingResult.value.mode === "live" ? "live" : "demo");
      }
      if (healthResult.status === "fulfilled" && healthResult.value.items?.length) {
        setSourceHealth(healthResult.value.items);
        const latest = healthResult.value.items
          .map((item: SourceHealth) => item.finishedAt ? Date.parse(item.finishedAt) : 0)
          .reduce((maximum: number, value: number) => Math.max(maximum, value), 0);
        setLastScan(latest
          ? new Date(latest).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "Awaiting first run");
      }
    });
  }, []);

  useEffect(() => {
    if (!garageKey) return;
    fetch("/api/garage", { headers: { "X-Garage-Key": garageKey } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access code not recognized.")))
      .then((payload) => {
        setGarage(payload.items ?? []);
        setGarageError("");
        window.localStorage.setItem("sound-room-garage-key", garageKey);
      })
      .catch((error: Error) => {
        setGarageError(error.message);
        setGarageKey("");
        window.localStorage.removeItem("sound-room-garage-key");
      });
  }, [garageKey]);

  const unlockGarage = () => {
    const candidate = garageKeyDraft.trim();
    if (!candidate) return;
    setGarageError("");
    setGarageKey(candidate);
  };

  const brands = useMemo(() => [...new Set(listings.map((item) => item.brand).filter(Boolean))] as string[], [listings]);
  const sources = useMemo(() => [...new Set(listings.map((item) => item.source))], [listings]);
  const filtered = useMemo(() => listings.filter((listing) => {
    const text = `${listing.title} ${listing.brand} ${listing.model}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) &&
      (grade === "all" || listing.score.grade === grade) &&
      (brand === "all" || listing.brand === brand) &&
      (source === "all" || listing.source === source);
  }), [listings, query, grade, brand, source]);
  const newListings = filtered.filter((listing) => listing.demoOrder < 4);
  const greatDeals = listings.filter((listing) => listing.score.grade === "great").length;
  const potentialProfit = listings.reduce((sum, listing) => sum + Math.max(0, listing.score.expectedProfitCents ?? 0), 0);

  const saveListing = async (listing: DemoListing) => {
    if (!garageKey) {
      setSelected(null);
      setView("garage");
      setGarageError("Enter the Garage access code before saving equipment.");
      return;
    }
    if (garage.some((item) => item.listingId === listing.id)) return;
    const item: GarageItem = {
      id: `garage_${listing.id}`,
      listingId: listing.id,
      title: listing.title,
      stage: "watching",
      purchasePriceCents: null,
      partsCostCents: 0,
      targetSaleCents: listing.score.resaleHighCents,
    };
    setGarage((current) => [...current, item]);
    await fetch("/api/garage", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Garage-Key": garageKey },
      body: JSON.stringify(item),
    }).catch(() => undefined);
  };

  const moveGarageItem = async (item: GarageItem, stage: GarageStage) => {
    setGarage((current) => current.map((entry) => entry.id === item.id ? { ...entry, stage } : entry));
    await fetch("/api/garage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Garage-Key": garageKey },
      body: JSON.stringify({ id: item.id, stage }),
    }).catch(() => undefined);
  };

  return (
    <main className="sound-room-shell">
      <header className="receiver-header">
        <div className="brand-lockup"><div className="brand-mark"><Radio /></div><div><span>Vintage audio finder</span><h1>The Sound Room</h1></div></div>
        <div className="tuner-display"><span>UDALL 67146</span><div className="tuner-scale"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><strong>250 MI</strong></div>
        <div className="scan-status"><span className="status-lamp status-lamp-live" /><div><small>Last scan</small><strong>{lastScan}</strong></div><Button size="sm" variant="outline" onClick={() => window.location.reload()}>Refresh</Button></div>
      </header>

      <div className="demo-notice"><span>{inventoryMode === "live" ? "Live inventory" : "Demo inventory"}</span> {inventoryMode === "live" ? "Marketplace scans are feeding this dashboard." : "The working dashboard is live. Marketplace credentials will replace these labeled examples with fresh scans."}</div>

      <section className="dashboard-summary">
        <div className="summary-intro"><span className="eyebrow">Listening post · {SEARCH_CENTER.label}</span><h2>Fresh vintage finds, ranked for the repair bench.</h2><p>Every score includes travel, repair reserve, conservative sold value, fees, and confidence.</p></div>
        <div className="summary-card summary-great"><Gauge /><span>Great deals</span><strong>{greatDeals}</strong><small>worth a closer look</small></div>
        <div className="summary-card"><CircleDollarSign /><span>Profit on radar</span><strong>{money(potentialProfit)}</strong><small>conservative estimate</small></div>
        <div className="summary-card"><Warehouse /><span>In the garage</span><strong>{garage.length}</strong><small>watching through sold</small></div>
      </section>

      <Tabs value={view} onValueChange={(value) => setView(value as ViewName)} className="dashboard-tabs">
        <div className="working-toolbar">
          <TabsList className="view-tabs" variant="line">
            <TabsTrigger value="new">New deals <span>{newListings.length}</span></TabsTrigger>
            <TabsTrigger value="all">All listings <span>{filtered.length}</span></TabsTrigger>
            <TabsTrigger value="map">Radius map</TabsTrigger>
            <TabsTrigger value="garage">Garage <span>{garage.length}</span></TabsTrigger>
          </TabsList>
          <div className="toolbar-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Brand, model, or keyword" aria-label="Search listings" /></div>
        </div>

        <div className="dashboard-body">
          <aside className="filter-rail">
            <div className="filter-heading"><ListFilter /><span>Filters</span></div>
            <label>Deal grade<Select value={grade} onValueChange={(value) => setGrade(value as GradeFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["all", "great", "good", "average", "no-deal", "bad", "needs-review"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "All grades" : gradeLabels[value as keyof typeof gradeLabels]}</SelectItem>)}</SelectContent></Select></label>
            <label>Brand<Select value={brand} onValueChange={setBrand}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All brands</SelectItem>{brands.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
            <label>Source<Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{sources.map((value) => <SelectItem key={value} value={value}>{sourceLabel(value)}</SelectItem>)}</SelectContent></Select></label>
            <div className="filter-divider" />
            <span className="filter-subhead">Source health</span>
            <div className="source-health">{sourceHealth.map((item) => <div key={item.source}><i className={item.status === "healthy" ? "lamp-healthy" : "lamp-warn"} /><span>{sourceLabel(item.source)}</span><strong>{item.label}</strong></div>)}</div>
          </aside>

          <div className="working-surface">
            <TabsContent value="new"><div className="surface-heading"><div><span className="eyebrow">Since the last scan</span><h2>New on the dial</h2></div><p>{newListings.length} matches surfaced from configured sources.</p></div><div className="listing-grid">{newListings.map((listing) => <ListingCard key={listing.id} listing={listing} onInspect={() => setSelected(listing)} />)}</div></TabsContent>
            <TabsContent value="all"><div className="surface-heading"><div><span className="eyebrow">Complete inventory</span><h2>All matching equipment</h2></div><p>{filtered.length} listings after filters.</p></div><div className="listing-grid">{filtered.map((listing) => <ListingCard key={listing.id} listing={listing} onInspect={() => setSelected(listing)} />)}</div></TabsContent>
            <TabsContent value="map"><RadarMap listings={filtered} onInspect={setSelected} /></TabsContent>
            <TabsContent value="garage"><div className="surface-heading"><div><span className="eyebrow">Repair and resale workflow</span><h2>The Garage</h2></div><p>Save a listing, then track it from first contact through sale.</p></div>{garageKey ? <GarageBoard items={garage} listings={listings} onMove={moveGarageItem} /> : <section className="garage-gate"><Warehouse /><div><span className="eyebrow">Private repair bench</span><h3>Unlock the Garage</h3><p>Live listings are public. Repair projects stay behind the family access code.</p></div><div className="garage-key-form"><Input type="password" value={garageKeyDraft} onChange={(event) => setGarageKeyDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && unlockGarage()} placeholder="Garage access code" aria-label="Garage access code" /><Button onClick={unlockGarage}>Unlock</Button></div>{garageError && <p className="garage-error" role="alert">{garageError}</p>}</section>}</TabsContent>
          </div>
        </div>
      </Tabs>

      <DetailSheet listing={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} onSave={saveListing} saved={Boolean(selected && garage.some((item) => item.listingId === selected.id))} />
      <footer><span>The Sound Room</span><p>Scores are estimates, not appraisals. Inspect and test equipment before buying.</p></footer>
    </main>
  );
}
