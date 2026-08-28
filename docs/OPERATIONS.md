# Operations

## First live scan checklist

1. Deploy the site and apply both SQL migrations in `drizzle/` to its D1 database.
2. Set long random `INGEST_KEY` and `GARAGE_ACCESS_KEY` values in the site runtime.
3. Add eBay credentials as GitHub Actions secrets. The workflow's short-lived
   OIDC token authenticates ingestion; no permanent ingest key is stored in GitHub.
4. Run **Scan vintage audio listings** manually in GitHub Actions.
5. Confirm the job says `Published … matches`, the dashboard changes to **Live
   inventory**, and `/api/health` reports the collector run.
6. Add Pushover secrets only after ingestion works.

The public dashboard exposes only active listing summaries and collector
health. Garage reads and writes require the separate `GARAGE_ACCESS_KEY`.

## Health and recovery

- **eBay says Add keys:** credentials are absent from the runner.
- **eBay is degraded:** inspect the Action log for rate limiting or a rejected
  search. One failed brand query does not discard other results.
- **Ingest returns 401 in Actions:** confirm `id-token: write`, the `main` ref,
  and the exact `.github/workflows/collect.yml` workflow path have not changed.
- **Local Facebook publish returns 401:** the local `INGEST_KEY` does not match
  the site runtime value.
- **Dashboard remains in demo mode:** verify migrations and inspect the ingest
  response. Demo mode is the expected empty-database fallback.
- **No Great Deal alerts:** a listing needs a price and defensible sold comps.
  The first-party eBay collector currently treats listings without comp data as
  Needs Review. This is intentional.
- **Scheduled workflow stopped:** GitHub may disable schedules in inactive
  public repositories. Re-enable the workflow or push a maintenance commit.

Collectors run independently with `Promise.allSettled`, so one source failure
cannot erase another source's results. Cross-posts are deduplicated after
normalization. The UI reads the most recent run for each source.

## Credential rules

- Keep all secrets in the site environment, GitHub Actions secrets, or a local
  untracked environment file.
- Do not place Facebook credentials in this repository or GitHub Actions.
- Rotate `INGEST_KEY` immediately if it appears in a log or commit.
- Treat a Reverb 401/403 as a signal to add `REVERB_TOKEN` or pause that source;
  the other collectors will continue independently.

## Database changes

Change `db/schema.ts`, run `npm run db:generate`, inspect the generated SQL, and
apply migrations in order. Never edit an already-applied migration.
