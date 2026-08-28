# The Sound Room

The Sound Room is a vintage hi-fi deal finder centered on Udall, Kansas. It
normalizes speaker and receiver listings, rejects equipment outside a 250-mile
radius when coordinates are available, explains repair risk, and tracks finds
from the first look through repair and resale.

The UI uses a warm 1970s catalog and receiver-face design: paper, walnut, brass,
black instrument panels, hard edges, large price and score readouts, and compact
inventory controls. The design rules live in [`DESIGN.md`](DESIGN.md).

## What works

- Responsive dashboard with search, grade/brand/source filters, detail sheets,
  an Udall-centered radius view, and a persistent Garage pipeline.
- Brand aliases for JBL, Klipsch/Klipsh, Advent, Pioneer/Pioner, Sansui,
  Marantz, and Yamaha.
- Explainable Great / Good / Average / No Deal / Bad gauge. Missing price or
  defensible sold comps produces **Needs Review**, never a made-up score.
- Repair-risk reserves, mileage, shipping, and selling fees in the economics.
- Official eBay Browse API collector, compliance-gated Reverb adapter, and an
  authorized JSON bridge for Facebook/estate-sale/manual discoveries.
- GitHub OIDC-authenticated ingest, source-health history, Pushover Great Deal
  alerts, and a GitHub Actions scan every six hours.
- A private family access code for the Garage while the listing dashboard can
  remain publicly viewable.
- Labeled demo inventory until the first successful live ingest.

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Generate `INGEST_KEY` only for local/manual ingestion and `GARAGE_ACCESS_KEY`
for the private repair workflow. Add eBay developer credentials to enable the
official collector. Never commit `.env.local` or marketplace credentials.

```bash
npm run lint
npm test
npm run collect
```

`npm run collect` is a safe dry run when local ingest credentials are missing.
GitHub Actions obtains a short-lived OIDC token automatically. Database
migrations are under `drizzle/`.

## Scheduled collection

.github/workflows/collect.yml` runs at minute 17 every sixth hour and can also
be started manually. Configure these GitHub Actions secrets:

- `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`
- optionally `PUSHOVER_USER_KEY`, `PUSHOVER_APP_TOKEN`

The workflow is pinned to this repository, branch, and workflow file by the
site's OIDC verifier. No permanent ingestion secret is stored in GitHub.

Facebook credentials are deliberately excluded from GitHub Actions. Follow the
isolated sidecar instructions in [`collectors/facebook/README.md`](collectors/facebook/README.md).
The sold-comparable adapter follows the approach demonstrated by
[`YosefHayim/ebay-mcp`](https://github.com/YosefHayim/ebay-mcp). The supplied
[`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp) is an
optional authorized browser sidecar, not a source of marketplace credentials.

## Architecture

```mermaid
flowchart TD
  A["Collectors every 6 hours"] --> B["Normalize, geofence, deduplicate"]
  B --> C["Authenticated ingest"]
  C --> D["D1 listings and run health"]
  D --> E["Deal dashboard"]
  E --> F["Garage repair pipeline"]
  C --> G["Great Deal alerts"]
```

Operational setup and failure recovery are in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md). The deal formula is documented in
[`docs/SCORING.md`](docs/SCORING.md), and source boundaries are in
[`docs/SOURCES.md`](docs/SOURCES.md).

## Important boundary

Scores are triage estimates, not appraisals. Photos, model identity, driver
condition, serial numbers, and an in-person listening test still matter before
buying. The application never bypasses marketplace access controls.
