export type MCPTransportType = "streamable_http" | "sse";

export interface MCPConnection {
  type: MCPTransportType;
  baseUrl: string;
  accessToken: string;
}

export interface MCPToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface MCPToolResult {
  content: unknown;
  isError?: boolean;
}

export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPJsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPJsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}