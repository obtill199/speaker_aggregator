type RunRow = {
  source: string;
  status: "healthy" | "degraded" | "failed";
  finished_at: number | null;
  error_message: string | null;
};

const defaults = [
  { source: "ebay", status: "setup", label: "Add keys" },
  { source: "facebook", status: "setup", label: "Setup" },
  { source: "reverb", status: "healthy", label: "Ready" },
  { source: "estatesales", status: "healthy", label: "Ready" },
];

export async function GET(request: Request) {
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare(
    `SELECT source, status, finished_at, error_message FROM collector_runs AS run
     WHERE started_at = (SELECT MAX(started_at) FROM collector_runs WHERE source = run.source)
     ORDER BY source`,
  ).all<RunRow>();

  if (!result.results.length) return publicJson(request, { items: defaults });

  const items = result.results.map((row) => ({
    source: row.source,
    status: row.status,
    label: row.status === "healthy" ? "Healthy" : row.status === "failed" ? "Failed" : "Check",
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    message: row.error_message,
  }));
  return publicJson(request, { items });
}
import { publicJson } from "@/lib/http/cors";
