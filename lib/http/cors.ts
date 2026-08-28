const GITHUB_PAGES_ORIGIN = "https://obtill199.github.io";

export function publicJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const origin = request.headers.get("origin");
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (origin === GITHUB_PAGES_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", GITHUB_PAGES_ORIGIN);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}
