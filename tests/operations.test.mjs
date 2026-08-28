import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("collector schedule runs every six hours off the hour", async () => {
  const workflow = await readFile(new URL(".github/workflows/collect.yml", root), "utf8");
  assert.match(workflow, /cron:\s*["']17 \*\/6 \* \* \*["']/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /https:\/\/the-sound-room\.obtill199\.chatgpt\.site\/api\/ingest/);
  assert.doesNotMatch(workflow, /secrets\.INGEST_KEY/);
  assert.doesNotMatch(workflow, /replace-with-a-long-random-value/);
});

test("public deployment keeps the Garage behind a separate family key", async () => {
  const route = await readFile(new URL("app/api/garage/route.ts", root), "utf8");
  assert.match(route, /GARAGE_ACCESS_KEY/);
  assert.match(route, /x-garage-key/i);
  assert.match(route, /timingSafeEqual/);
});

test("Facebook sidecar keeps credentials out of its checked-in config", async () => {
  const config = await readFile(new URL("collectors/facebook/config.example.toml", root), "utf8");
  assert.match(config, /search_city = "wichita"/);
  assert.match(config, /search_interval = "6h"/);
  assert.doesNotMatch(config, /^\s*(username|password)\s*=/m);
});

test("operational documentation preserves compliance and scoring safeguards", async () => {
  const [sources, scoring] = await Promise.all([
    readFile(new URL("docs/SOURCES.md", root), "utf8"),
    readFile(new URL("docs/SCORING.md", root), "utf8"),
  ]);
  assert.match(sources, /No collector attempts to bypass/i);
  assert.match(scoring, /Needs Review/);
  assert.match(scoring, /lower quartile/i);
});
