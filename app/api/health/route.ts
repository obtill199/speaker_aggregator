type RunRow = {
  source: string;
  status: "healthy" | "degraded" | "failed";
  finished_at: number | null;
  error_message: string | null;
};

const defaults = [
  { source: "ebay", status: "setup", label: "Add keys" },
  { source: "facebook", status: "setup", label: "Setup" },
  { source: "reverb", status: "disabled", label: "Permission" },
  { source: "manual", status: "healthy", label: "Ready" },
];

export async function GET() {
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare(
    `SELECT source, status, finished_at, error_message FROM collector_runs AS run
     WHERE started_at = (SELECT MAX(started_at) FROM collector_runs WHERE source = run.source)
     ORDER BY source`,
  ).all<RunRow>();

  if (!result.results.length) return Response.json({ items: defaults });

  const items = result.results.map((row) => ({
    source: row.source,
    status: row.status,
    label: row.status === "healthy" ? "Healthy" : row.status === "failed" ? "Failed" : "Check",
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    message: row.error_message,
  }));
  return Response.json({ items });
}
