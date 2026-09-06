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

test("does not keep estate-sale whole-house leads as a listing category", async () => {
  const { classifyCategory } = await vite.ssrLoadModule("/lib/domain/listing.ts");
  assert.equal(classifyCategory("Estate sale preview — Marantz receiver"), "receiver");
  assert.equal(classifyCategory("JBL L100 Century speakers"), "speaker");
});

test("maps public Reverb results into normalized USD listings", async () => {
  const { ReverbCollector } = await vite.ssrLoadModule("/lib/collectors/reverb.ts");
  const collector = new ReverbCollector();
  let calls = 0;
  const result = await collector.collect({
    fetch: async (url) => {
      calls += 1;
      const query = new URL(url).searchParams.get("query") ?? "";
      assert.match(query, /vintage speakers/);
      assert.doesNotMatch(query, /receiver/);
      assert.equal(new URL(url).searchParams.get("ships_to"), "US");
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
  assert.equal(calls, 4);
  assert.equal(result.status, "healthy");
  assert.equal(result.listings[0].priceCents, 82500);
  assert.equal(result.listings[0].description, "Classic walnut cabinets");
  assert.equal(result.listings[0].url, "https://reverb.com/item/77");
});

test("Reverb collector drops lamp kits and drum hardware before ingest", async () => {
  const { ReverbCollector } = await vite.ssrLoadModule("/lib/collectors/reverb.ts");
  const collector = new ReverbCollector();
  const result = await collector.collect({
    fetch: async () => Response.json({
      listings: [
        {
          id: 1,
          title: "Vintage JBL L100 speakers",
          price: { amount_cents: 82500, currency: "USD" },
          _links: { web: { href: "https://reverb.com/item/1" } },
        },
        {
          id: 2,
          title: "(10) Green LED 8V Fuse Style Lamps for Marantz",
          price: { amount_cents: 1800, currency: "USD" },
          _links: { web: { href: "https://reverb.com/item/2" } },
        },
        {
          id: 3,
          title: "Yamaha 2-Hole Receiver Double Tom Mount Holder Post - Vintage",
          price: { amount_cents: 9000, currency: "USD" },
          _links: { web: { href: "https://reverb.com/item/3" } },
        },
      ],
    }),
  });
  assert.equal(result.listings.length, 4);
  assert.ok(result.listings.every((item) => item.title.includes("JBL L100")));
});

test("retries one transient Reverb failure without degrading the whole source", async () => {
  const { ReverbCollector } = await vite.ssrLoadModule("/lib/collectors/reverb.ts");
  const collector = new ReverbCollector();
  let calls = 0;
  const result = await collector.collect({
    fetch: async () => {
      calls += 1;
      if (calls === 1) return new Response("temporary", { status: 502 });
      return Response.json({ listings: [] });
    },
  });
  assert.equal(calls, 5);
  assert.equal(result.status, "healthy");
  assert.deepEqual(result.warnings, []);
});

test("GitHub Pages CORS is exact and does not open the API to arbitrary origins", async () => {
  const { publicJson } = await vite.ssrLoadModule("/lib/http/cors.ts");
  const allowed = publicJson(new Request("https://example.com", { headers: { Origin: "https://obtill199.github.io" } }), { ok: true });
  const blocked = publicJson(new Request("https://example.com", { headers: { Origin: "https://evil.example" } }), { ok: true });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://obtill199.github.io");
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});
