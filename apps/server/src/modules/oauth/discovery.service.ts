import { getEnv } from "../../config/environment";
import { OAUTH_METADATA_CACHE_TTL_SECONDS } from "../../config/constants";
import { OAuthDiscoveryError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type {
  ProtectedResourceMetadata,
  AuthorizationServerMetadata,
} from "./oauth.types";

// ─── In-memory metadata cache ───────────────────────────────────────
let cachedMetadata: AuthorizationServerMetadata | null = null;
let cacheExpiresAt: number = 0;

/**
 * Discover OAuth metadata following:
 *   1. RFC 9470 — Protected Resource Metadata
 *   2. RFC 8414 — Authorization Server Metadata
 */
export async function discoverOAuthMetadata(): Promise<AuthorizationServerMetadata> {
  // Return cached if valid
  if (cachedMetadata && Date.now() < cacheExpiresAt) {
    logger.debug("Using cached OAuth metadata");
    return cachedMetadata;
  }

  const env = getEnv();
  const mcpServerUrl = env.MCP_SERVER_URL;

  // ── Step 1: RFC 9470 — Protected Resource Metadata ─────────────
  const resourceMetadataUrl = `${mcpServerUrl}/.well-known/oauth-protected-resource`;
  logger.info("Fetching protected resource metadata", { url: resourceMetadataUrl });

  let resourceResponse: Response;
  try {
    resourceResponse = await fetch(resourceMetadataUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new OAuthDiscoveryError(
      `Network error fetching resource metadata: ${(err as Error).message}`
    );
  }

  if (!resourceResponse.ok) {
    throw new OAuthDiscoveryError(
      `Resource metadata returned ${resourceResponse.status}`
    );
  }

  const resourceMetadata = await resourceResponse.json() as ProtectedResourceMetadata;

  if (
    !resourceMetadata.authorization_servers ||
    resourceMetadata.authorization_servers.length === 0
  ) {
    throw new OAuthDiscoveryError("No authorization server declared in resource metadata");
  }

  const authorizationServerUrl = resourceMetadata.authorization_servers[0];
  logger.info("Discovered authorization server", { url: authorizationServerUrl });

  // ── Step 2: RFC 8414 — Authorization Server Metadata ───────────
  const parsedIssuer = new URL(authorizationServerUrl);
  const asMetadataUrl =
    parsedIssuer.origin +
    "/.well-known/oauth-authorization-server" +
    parsedIssuer.pathname;

  logger.info("Fetching AS metadata", { url: asMetadataUrl });

  let asResponse: Response;
  try {
    asResponse = await fetch(asMetadataUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new OAuthDiscoveryError(
      `Network error fetching AS metadata: ${(err as Error).message}`
    );
  }

  if (!asResponse.ok) {
    throw new OAuthDiscoveryError(
      `AS metadata returned ${asResponse.status}`
    );
  }

  const asMetadata = await asResponse.json() as AuthorizationServerMetadata;

  // ── Step 3: Validate required fields ───────────────────────────
  if (!asMetadata.authorization_endpoint) {
    throw new OAuthDiscoveryError("Missing authorization_endpoint in AS metadata");
  }
  if (!asMetadata.token_endpoint) {
    throw new OAuthDiscoveryError("Missing token_endpoint in AS metadata");
  }
  if (
    !asMetadata.code_challenge_methods_supported ||
    !asMetadata.code_challenge_methods_supported.includes("S256")
  ) {
    throw new OAuthDiscoveryError("AS does not support S256 code challenge method");
  }

  // ── Step 4: Cache ──────────────────────────────────────────────
  cachedMetadata = asMetadata;
  cacheExpiresAt = Date.now() + OAUTH_METADATA_CACHE_TTL_SECONDS * 1000;
  logger.info("OAuth metadata cached", {
    authorizationEndpoint: asMetadata.authorization_endpoint,
    tokenEndpoint: asMetadata.token_endpoint,
  });

  return asMetadata;
}

/** Clear the metadata cache (for testing or forced refresh) */
export function clearMetadataCache(): void {
  cachedMetadata = null;
  cacheExpiresAt = 0;
}