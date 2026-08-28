const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS_URL = `${GITHUB_ISSUER}/.well-known/jwks`;
const EXPECTED_AUDIENCE = "the-sound-room";
const EXPECTED_REPOSITORY = "obtill199/speaker_aggregator";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW = `${EXPECTED_REPOSITORY}/.github/workflows/collect.yml@${EXPECTED_REF}`;

type JwtHeader = { alg?: string; kid?: string };
type JwtClaims = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; repository?: string; ref?: string; workflow_ref?: string };
type JwksResponse = { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
let jwksCache: { expiresAt: number; value: JwksResponse } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

async function getJwks(fetcher: typeof fetch) {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.value;
  const response = await fetcher(GITHUB_JWKS_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GitHub JWKS returned ${response.status}.`);
  const value = (await response.json()) as JwksResponse;
  jwksCache = { value, expiresAt: Date.now() + 60 * 60 * 1000 };
  return value;
}

export async function verifyGitHubCollectorToken(token: string, fetcher = fetch) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = decodeJson<JwtHeader>(parts[0]);
    claims = decodeJson<JwtClaims>(parts[1]);
  } catch {
    return false;
  }
  if (header.alg !== "RS256" || !header.kid) return false;
  const jwk = (await getJwks(fetcher)).keys?.find((candidate) => candidate.kid === header.kid);
  if (!jwk || (jwk.alg && jwk.alg !== "RS256")) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!signatureValid) return false;
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return claims.iss === GITHUB_ISSUER && audience.includes(EXPECTED_AUDIENCE) && typeof claims.exp === "number" && claims.exp > now - 30 && (claims.nbf === undefined || claims.nbf <= now + 30) && claims.repository === EXPECTED_REPOSITORY && claims.ref === EXPECTED_REF && claims.workflow_ref === EXPECTED_WORKFLOW;
}
