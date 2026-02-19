// ─── OAuth ──────────────────────────────────────────────────────────
export const OAUTH_STATE_EXPIRY_MINUTES = 10;
export const OAUTH_STATE_EXPIRY_MS = OAUTH_STATE_EXPIRY_MINUTES * 60 * 1000;

// ─── Token ──────────────────────────────────────────────────────────
/** Proactive refresh buffer — refresh if token expires within this window */
export const TOKEN_REFRESH_BUFFER_SECONDS = 300; // 5 minutes
export const TOKEN_REFRESH_BUFFER_MS = TOKEN_REFRESH_BUFFER_SECONDS * 1000;

/** Redis distributed lock TTL for token refresh */
export const TOKEN_REFRESH_LOCK_TTL_SECONDS = 30;

/** How long to wait for another process that holds the lock */
export const TOKEN_REFRESH_WAIT_TIMEOUT_MS = 5_000;
export const TOKEN_REFRESH_WAIT_POLL_MS = 250;

/** Maximum retries for token refresh on network errors */
export const TOKEN_REFRESH_MAX_RETRIES = 3;

// ─── MCP ────────────────────────────────────────────────────────────
export const MCP_HTTP_PATH = "/mcp";
export const MCP_SSE_PATH = "/sse";
export const MCP_CONNECT_TIMEOUT_MS = 10_000;
export const MCP_SSE_CONNECT_TIMEOUT_MS = 15_000;

// ─── Network Retry ──────────────────────────────────────────────────
export const NETWORK_RETRY_MAX = 3;
export const NETWORK_RETRY_BASE_DELAY_MS = 1_000;

// ─── Session ────────────────────────────────────────────────────────
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_COOKIE_NAME = "notion_mcp_sid";

// ─── OAuth Metadata Cache ───────────────────────────────────────────
export const OAUTH_METADATA_CACHE_TTL_SECONDS = 3600; // 1 hour

// ─── Cleanup ────────────────────────────────────────────────────────
export const STATE_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ─── API Response Codes ─────────────────────────────────────────────
export const ERROR_CODES = {
  RECONNECTION_REQUIRED: "reconnection_required",
  NOTION_UNAVAILABLE: "notion_unavailable",
  RATE_LIMITED: "rate_limited",
  INTERNAL_ERROR: "internal_error",
} as const;