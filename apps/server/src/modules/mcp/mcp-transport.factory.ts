import { getEnv } from "../../config/environment";
import {
  MCP_HTTP_PATH,
  MCP_SSE_PATH,
  MCP_CONNECT_TIMEOUT_MS,
  MCP_SSE_CONNECT_TIMEOUT_MS,
} from "../../config/constants";
import { MCPConnectionError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import type { MCPConnection, MCPTransportType } from "./mcp.types";

/**
 * Create an MCP connection using Streamable HTTP as primary,
 * falling back to SSE if HTTP transport fails.
 */
export async function createMCPConnection(
  accessToken: string
): Promise<MCPConnection> {
  const env = getEnv();
  const baseUrl = env.MCP_SERVER_URL;

  // ── Diagnostic: Log token info (first/last 10 chars only for security) ───
  const tokenPreview = accessToken.length > 20
    ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}`
    : `[token too short: ${accessToken.length} chars]`;
  logger.info("Creating MCP connection", { 
    baseUrl, 
    tokenPreview,
    tokenLength: accessToken.length 
  });

  // ── Attempt 1: Streamable HTTP ─────────────────────────────────
  try {
    const httpUrl = `${baseUrl}${MCP_HTTP_PATH}`;
    logger.info("Attempting MCP connection via Streamable HTTP", { url: httpUrl });

    const requestBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: {
          name: "notion-mcp-integration",
          version: "1.0.0",
        },
      },
    };

    const testResponse = await fetch(httpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(MCP_CONNECT_TIMEOUT_MS),
    });

    if (testResponse.ok) {
      logger.info("MCP connected via Streamable HTTP");
      return {
        type: "streamable_http",
        baseUrl: httpUrl,
        accessToken,
      };
    }

    // Log detailed error response
    const responseText = await testResponse.text();
    logger.warn("Streamable HTTP returned non-OK status", {
      status: testResponse.status,
      statusText: testResponse.statusText,
      responseBody: responseText.substring(0, 500),
      requestHeaders: {
        Authorization: `Bearer ${tokenPreview}`,
      },
    });
  } catch (err) {
    logger.warn("Streamable HTTP transport failed", {
      error: (err as Error).message,
    });
  }

  // ── Attempt 2: SSE Fallback ────────────────────────────────────
  try {
    const sseUrl = `${baseUrl}${MCP_SSE_PATH}`;
    logger.info("Attempting MCP connection via SSE fallback", { url: sseUrl });

    // For SSE, we do a test GET request to verify the endpoint responds
    const testResponse = await fetch(sseUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      signal: AbortSignal.timeout(MCP_SSE_CONNECT_TIMEOUT_MS),
    });

    if (testResponse.ok || testResponse.status === 200) {
      // Consume/abort the SSE stream from the test
      try {
        testResponse.body?.cancel();
      } catch {
        // ignore
      }

      logger.info("MCP connected via SSE fallback");
      return {
        type: "sse",
        baseUrl: sseUrl,
        accessToken,
      };
    }

    logger.warn("SSE fallback returned non-OK status", {
      status: testResponse.status,
    });
  } catch (err) {
    logger.error("SSE fallback also failed", {
      error: (err as Error).message,
    });
  }

  throw new MCPConnectionError(
    "Unable to connect to Notion MCP server via HTTP or SSE"
  );
}

/**
 * Create a connection specifically using SSE transport.
 * Used when an existing HTTP connection fails mid-request.
 */
export async function createSSEConnection(
  accessToken: string
): Promise<MCPConnection> {
  const env = getEnv();
  const sseUrl = `${env.MCP_SERVER_URL}${MCP_SSE_PATH}`;

  try {
    const testResponse = await fetch(sseUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      signal: AbortSignal.timeout(MCP_SSE_CONNECT_TIMEOUT_MS),
    });

    if (testResponse.ok) {
      try {
        testResponse.body?.cancel();
      } catch {
        // ignore
      }
      return {
        type: "sse",
        baseUrl: sseUrl,
        accessToken,
      };
    }
  } catch (err) {
    throw new MCPConnectionError(
      `SSE connection failed: ${(err as Error).message}`
    );
  }

  throw new MCPConnectionError("SSE endpoint returned non-OK status");
}