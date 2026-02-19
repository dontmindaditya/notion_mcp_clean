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
 * Discover OAuth metadata for Notion.
 * 
 * Notion's OAuth endpoints are at api.notion.com, NOT at mcp.notion.com.
 * The MCP server and OAuth authorization server are separate services.
 * 
 * Notion OAuth endpoints:
 *   - Authorization: https://api.notion.com/v1/oauth/authorize
 *   - Token: https://api.notion.com/v1/oauth/token
 * 
 * We first try RFC 9470/8414 discovery, then fall back to hardcoded endpoints.
 */
export async function discoverOAuthMetadata(): Promise<AuthorizationServerMetadata> {
  // Return cached if valid
  if (cachedMetadata && Date.now() < cacheExpiresAt) {
    logger.debug("Using cached OAuth metadata");
    return cachedMetadata;
  }

  const env = getEnv();
  const mcpServerUrl = env.MCP_SERVER_URL;

  // ── Try RFC 9470 discovery first ─────────────────────────────────
  try {
    const resourceMetadataUrl = `${mcpServerUrl}/.well-known/oauth-protected-resource`;
    logger.info("Fetching protected resource metadata", { url: resourceMetadataUrl });

    const resourceResponse = await fetch(resourceMetadataUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (resourceResponse.ok) {
      const resourceMetadata = await resourceResponse.json() as ProtectedResourceMetadata;

      if (resourceMetadata.authorization_servers?.length) {
        const authorizationServerUrl = resourceMetadata.authorization_servers[0];
        logger.info("Discovered authorization server", { url: authorizationServerUrl });

        // Try RFC 8414 discovery
        const metadata = await fetchAuthorizationServerMetadata(authorizationServerUrl);
        if (metadata) {
          return cacheMetadata(metadata);
        }
      }
    }
  } catch (err) {
    logger.warn("RFC 9470 discovery failed, falling back to hardcoded endpoints", {
      error: (err as Error).message,
    });
  }

  // ── Fallback: Use Notion's known OAuth endpoints ─────────────────
  logger.info("Using Notion's hardcoded OAuth endpoints");
  
  const notionMetadata: AuthorizationServerMetadata = {
    issuer: "https://api.notion.com",
    authorization_endpoint: "https://api.notion.com/v1/oauth/authorize",
    token_endpoint: "https://api.notion.com/v1/oauth/token",
    code_challenge_methods_supported: ["S256"],
    response_types_supported: ["code"],
    scopes_supported: ["read", "write", "read_content", "write_content"],
  };

  return cacheMetadata(notionMetadata);
}

/**
 * Try to fetch authorization server metadata via RFC 8414.
 */
async function fetchAuthorizationServerMetadata(
  issuerUrl: string
): Promise<AuthorizationServerMetadata | null> {
  try {
    const parsedIssuer = new URL(issuerUrl);
    const asMetadataUrl =
      parsedIssuer.origin +
      "/.well-known/oauth-authorization-server" +
      parsedIssuer.pathname;

    logger.info("Fetching AS metadata", { url: asMetadataUrl });

    const asResponse = await fetch(asMetadataUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!asResponse.ok) {
      logger.warn("AS metadata fetch failed", { status: asResponse.status });
      return null;
    }

    const asMetadata = await asResponse.json() as AuthorizationServerMetadata;

    // Validate required fields
    if (!asMetadata.authorization_endpoint || !asMetadata.token_endpoint) {
      logger.warn("AS metadata missing required fields");
      return null;
    }

    if (!asMetadata.code_challenge_methods_supported?.includes("S256")) {
      logger.warn("AS does not support S256");
      return null;
    }

    return asMetadata;
  } catch (err) {
    logger.warn("Failed to fetch AS metadata", { error: (err as Error).message });
    return null;
  }
}

/**
 * Cache the metadata and return it.
 */
function cacheMetadata(metadata: AuthorizationServerMetadata): AuthorizationServerMetadata {
  cachedMetadata = metadata;
  cacheExpiresAt = Date.now() + OAUTH_METADATA_CACHE_TTL_SECONDS * 1000;
  logger.info("OAuth metadata cached", {
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
  });
  return metadata;
}

/** Clear the metadata cache (for testing or forced refresh) */
export function clearMetadataCache(): void {
  cachedMetadata = null;
  cacheExpiresAt = 0;
}