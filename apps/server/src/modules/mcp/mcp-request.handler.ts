import { logger } from "../../utils/logger";
import { MCPRequestError } from "../../utils/errors";
import { getValidAccessToken, refreshAccessToken } from "../token/token.service";
import { touchLastUsed } from "../token/token.repository";
import {
  getOrCreateConnection,
  sendMCPRequest,
  invalidateConnection,
} from "./mcp-client.service";
import { createSSEConnection } from "./mcp-transport.factory";
import type { MCPJsonRpcResponse } from "./mcp.types";

/**
 * Execute an MCP tool call for a user.
 *
 * Flow:
 * 1. Get valid access token (may trigger proactive refresh)
 * 2. Get or create MCP connection
 * 3. Send the request
 * 4. On 401 → refresh token, retry once
 * 5. On transport failure → fallback to SSE, retry once
 */
export async function executeMCPToolCall(
  userId: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  const accessToken = await getValidAccessToken(userId);
  let connection = await getOrCreateConnection(userId, accessToken);

  try {
    const response = await sendMCPRequest(connection, "tools/call", {
      name: toolName,
      arguments: toolArgs,
    });

    handleRpcError(response);

    // Update last used (fire-and-forget)
    touchLastUsed(userId).catch(() => {});

    return response.result;
  } catch (err) {
    // ── Handle auth failure (401) — refresh and retry once ───────
    if (isAuthError(err)) {
      logger.warn("MCP returned 401, refreshing token and retrying", { userId });

      invalidateConnection(userId);
      const newToken = await refreshAccessToken(userId);
      connection = await getOrCreateConnection(userId, newToken);

      const retryResponse = await sendMCPRequest(connection, "tools/call", {
        name: toolName,
        arguments: toolArgs,
      });

      handleRpcError(retryResponse);
      touchLastUsed(userId).catch(() => {});
      return retryResponse.result;
    }

    // ── Handle transport failure — fallback to SSE ───────────────
    if (isTransportError(err) && connection.type === "streamable_http") {
      logger.warn("HTTP transport failed, falling back to SSE", { userId });

      try {
        invalidateConnection(userId);
        const sseConnection = await createSSEConnection(accessToken);

        const fallbackResponse = await sendMCPRequest(
          sseConnection,
          "tools/call",
          { name: toolName, arguments: toolArgs }
        );

        handleRpcError(fallbackResponse);
        touchLastUsed(userId).catch(() => {});
        return fallbackResponse.result;
      } catch (sseErr) {
        logger.error("SSE fallback also failed", {
          userId,
          error: (sseErr as Error).message,
        });
        throw new MCPRequestError("Transport failure on both HTTP and SSE");
      }
    }

    throw err;
  }
}

/**
 * Execute a generic MCP method (not just tool calls).
 */
export async function executeMCPRequest(
  userId: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const accessToken = await getValidAccessToken(userId);
  const connection = await getOrCreateConnection(userId, accessToken);

  const response = await sendMCPRequest(connection, method, params);
  handleRpcError(response);

  touchLastUsed(userId).catch(() => {});
  return response.result;
}

// ─── Helpers ────────────────────────────────────────────────────────

function isAuthError(err: unknown): boolean {
  return (
    err instanceof Error &&
    ((err as any).status === 401 || err.message.includes("authentication"))
  );
}

function isTransportError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("Transport") ||
      err.message.includes("fetch") ||
      err.message.includes("network") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("timeout"))
  );
}

function handleRpcError(response: MCPJsonRpcResponse): void {
  if (response.error) {
    logger.error("MCP JSON-RPC error", {
      code: response.error.code,
      message: response.error.message,
    });
    throw new MCPRequestError(
      `MCP error (${response.error.code}): ${response.error.message}`
    );
  }
}