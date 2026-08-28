# Operations

## First live scan checklist

1. Deploy the site and apply both SQL migrations in `drizzle/` to its D1 database.
2. Set a long random `INGEST_KEY` in the site runtime.
3. Add the same key, the deployed `/api/ingest` URL, and eBay credentials as
   GitHub Actions secrets.
4. Run **Scan vintage audio listings** manually in GitHub Actions.
5. Confirm the job says `Published … matches`, the dashboard changes to **Live
   inventory**, and `/api/health` reports the collector run.
6. Add Pushover secrets only after ingestion works.

The site access policy must allow the GitHub runner to reach `/api/ingest`.
Keeping the deployment owner-only is safest for evaluation, but an external
scheduled runner cannot cross that access gate. Make this decision explicitly
before enabling live ingestion.

## Health and recovery

- **eBay says Add keys:** credentials are absent from the runner.
- **eBay is degraded:** inspect the Action log for rate limiting or a rejected
  search. One failed brand query does not discard other results.
- **Ingest returns 401:** runtime and GitHub `INGEST_KEY` values do not match.
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
- Leave `REVERB_ENABLED=false` until access and automated-use permission are
  confirmed.

## Database changes

Change `db/schema.ts`, run `npm run db:generate`, inspect the generated SQL, and
apply migrations in order. Never edit an already-applied migration.
