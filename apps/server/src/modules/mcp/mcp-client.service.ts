import { logger } from "../../utils/logger";
import { MCPRequestError } from "../../utils/errors";
import { createMCPConnection, createSSEConnection } from "./mcp-transport.factory";
import type {
  MCPConnection,
  MCPJsonRpcRequest,
  MCPJsonRpcResponse,
} from "./mcp.types";

// ─── Per-user connection cache (in-process) ─────────────────────────
const connectionCache = new Map<string, MCPConnection>();

let requestIdCounter = 1;

function nextRequestId(): number {
  return requestIdCounter++;
}

/**
 * Get or create an MCP connection for a user.
 */
export async function getOrCreateConnection(
  userId: string,
  accessToken: string
): Promise<MCPConnection> {
  const existing = connectionCache.get(userId);

  // Reuse if same token (token hasn't been refreshed)
  if (existing && existing.accessToken === accessToken) {
    return existing;
  }

  // Create new connection
  const connection = await createMCPConnection(accessToken);
  connectionCache.set(userId, connection);
  return connection;
}

/**
 * Send a JSON-RPC request to the MCP server via HTTP transport.
 */
async function sendHTTPRequest(
  connection: MCPConnection,
  rpcRequest: MCPJsonRpcRequest
): Promise<MCPJsonRpcResponse> {
  const response = await fetch(connection.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(rpcRequest),
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 401) {
    const error = new Error("MCP authentication failed") as Error & { status: number };
    (error as any).status = 401;
    throw error;
  }

  if (!response.ok) {
    throw new MCPRequestError(
      `MCP HTTP request failed with status ${response.status}`
    );
  }

  // Handle streaming responses (text/event-stream)
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    return parseSSEResponse(response);
  }

  return response.json() as Promise<MCPJsonRpcResponse>;
}

/**
 * Parse an SSE response stream and extract the JSON-RPC response.
 */
async function parseSSEResponse(response: Response): Promise<MCPJsonRpcResponse> {
  const text = await response.text();
  const lines = text.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6).trim();
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          continue;
        }
      }
    }
  }

  throw new MCPRequestError("No valid JSON-RPC response found in SSE stream");
}

/**
 * Send a JSON-RPC request via SSE transport.
 * For SSE, we POST to the endpoint and read the response.
 */
async function sendSSERequest(
  connection: MCPConnection,
  rpcRequest: MCPJsonRpcRequest
): Promise<MCPJsonRpcResponse> {
  // SSE transport may require a different approach — posting to a message endpoint
  // For Notion's MCP SSE, we POST the JSON-RPC body to the SSE endpoint
  const response = await fetch(connection.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(rpcRequest),
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 401) {
    const error = new Error("MCP authentication failed") as Error & { status: number };
    (error as any).status = 401;
    throw error;
  }

  if (!response.ok) {
    throw new MCPRequestError(
      `MCP SSE request failed with status ${response.status}`
    );
  }

  return parseSSEResponse(response);
}

/**
 * Send a JSON-RPC request through the connection, using the appropriate transport.
 */
export async function sendMCPRequest(
  connection: MCPConnection,
  method: string,
  params?: Record<string, unknown>
): Promise<MCPJsonRpcResponse> {
  const rpcRequest: MCPJsonRpcRequest = {
    jsonrpc: "2.0",
    id: nextRequestId(),
    method,
    params,
  };

  logger.debug("Sending MCP request", { method, transport: connection.type });

  if (connection.type === "streamable_http") {
    return sendHTTPRequest(connection, rpcRequest);
  }

  return sendSSERequest(connection, rpcRequest);
}

/**
 * Invalidate a user's cached connection (after token refresh or disconnect).
 */
export function invalidateConnection(userId: string): void {
  connectionCache.delete(userId);
}