import assert from "node:assert/strict";
import test from "node:test";

test("renders The Sound Room product metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>The Sound Room<\/title>/i);
  assert.match(
    html,
    /Find, evaluate, repair, and track vintage speakers and receivers near Udall, Kansas\./i,
  );
  assert.doesNotMatch(html, /name=["']codex-preview["']/i);
  assert.match(html, /Fresh vintage finds, ranked for the repair bench\./i);
  assert.match(html, /New deals/i);
  assert.match(html, /All listings/i);
  assert.match(html, /Radius map/i);
  assert.match(html, /Garage/i);
  assert.match(html, /JBL L100 Century speakers/i);
  assert.match(html, /Demo inventory/i);
  assert.doesNotMatch(html, /Ship something real from a clean baseline/i);
});

test("ships The Sound Room design tokens and responsive rules", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("design", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const html = await response.text();
  const stylesheet = html.match(/href=["']([^"']+\.css)["']/i)?.[1];
  assert.ok(stylesheet, "rendered page should include a stylesheet");
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(
    new URL(`../dist/client${stylesheet}`, import.meta.url),
    "utf8",
  );
  assert.match(css, /--paper:#f2ead8/i);
  assert.match(css, /--brass:#c3923e/i);
  assert.match(css, /prefers-reduced-motion:reduce/i);
  assert.match(css, /(?:max-width:|width<=)(?:560px|35rem)/i);
});
