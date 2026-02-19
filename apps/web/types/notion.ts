// ===============================
// STATE & ERROR TYPES
// ===============================
export type ConnectionState =
  | "loading"
  | "connected"
  | "not_connected"
  | "error"
  | "reconnection_required";

export type ErrorCode =
  | "reconnection_required"
  | "notion_unavailable"
  | "rate_limited"
  | "internal_error";

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export function isApiError<T>(
  res: ApiResponse<T>
): res is ApiErrorResponse {
  return "error" in res;
}

// ===============================
// CONNECTION
// ===============================
export interface NotionConnectionStatus {
  connected: boolean;
  workspace_name?: string | null;
  workspace_id?: string | null;
  connected_at?: string | null;
  status?: "active" | "disconnected" | "error";
}

// ===============================
// AUTH
// ===============================
export interface ConnectResponse {
  url: string;
}

export interface CallbackPayload {
  code: string;
  state: string;
}

export interface CallbackResponse {
  success: boolean;
  workspace_name?: string | null;
}

// ===============================
// QUERY
// ===============================
export type NotionAction =
  | "search_pages"
  | "list_pages"
  | "list_databases";

export interface NotionQueryPayload {
  action: NotionAction;
  params?: Record<string, unknown>;
}

// ===============================
// NOTION DATA
// ===============================
export interface NotionPage {
  id: string;
  title?: string | null;
  url?: string | null;
  icon?: string | null;
  last_edited?: string | null;
  parent_type?: string | null;
}

export interface NotionDatabase {
  id: string;
  title?: string | null;
  url?: string | null;
  icon?: string | null;
  description?: string | null;
}

export interface NotionQueryResult {
  pages?: NotionPage[];
  databases?: NotionDatabase[];
  raw?: unknown;
}

// ===============================
// DISCONNECT
// ===============================
export interface DisconnectResponse {
  success: boolean;
}
