import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

test("parses EstateSales.net public state into geofenced sale leads", async () => {
  const { parseEstateSalePage } = await vite.ssrLoadModule("/lib/collectors/estate-sales.ts");
  const html = `<script id="estatesales-net-state" type="application/json">${JSON.stringify({
    NGRX_STATE: { ui: { sales: { saleRows: { "123": {
      id: 123,
      name: "Mid-century estate sale",
      cityName: "Wichita",
      stateCode: "KS",
      postalCodeNumber: "67202",
      latitude: 37.6872,
      longitude: -97.3301,
      typeName: "Estate Sale",
      pictureCount: 80,
      firstUtcStartDate: { _value: "2026-08-29T14:00:00Z" },
    } } } } },
  })}</script>`;
  const [raw] = parseEstateSalePage(html);
  assert.equal(raw.source, "estatesales");
  assert.match(raw.url, /\/KS\/Wichita\/67202\/123$/);

  const { normalizeListing } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  const normalized = normalizeListing(raw);
  assert.equal(normalized.category, "estate-lead");
  assert.equal(normalized.excluded, false);
  assert.ok(normalized.distanceMiles < 60);
});

test("maps public Reverb results into normalized USD listings", async () => {
  const { ReverbCollector } = await vite.ssrLoadModule("/lib/collectors/reverb.ts");
  const collector = new ReverbCollector();
  let calls = 0;
  const result = await collector.collect({
    fetch: async () => {
      calls += 1;
      return Response.json({ listings: [{
        id: 77,
        title: "Vintage JBL L100 speakers",
        description: "<p>Classic walnut cabinets</p>",
        price: { amount_cents: 82500, currency: "USD" },
        condition: { display_name: "Good" },
        _links: { web: { href: "https://reverb.com/item/77" } },
      }] });
    },
  });
  assert.equal(calls, 8);
  assert.equal(result.status, "healthy");
  assert.equal(result.listings[0].priceCents, 82500);
  assert.equal(result.listings[0].description, "Classic walnut cabinets");
  assert.equal(result.listings[0].url, "https://reverb.com/item/77");
});

test("GitHub Pages CORS is exact and does not open the API to arbitrary origins", async () => {
  const { publicJson } = await vite.ssrLoadModule("/lib/http/cors.ts");
  const allowed = publicJson(new Request("https://example.com", { headers: { Origin: "https://obtill199.github.io" } }), { ok: true });
  const blocked = publicJson(new Request("https://example.com", { headers: { Origin: "https://evil.example" } }), { ok: true });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://obtill199.github.io");
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});
