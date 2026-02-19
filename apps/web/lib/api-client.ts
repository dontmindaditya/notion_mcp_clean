import type { ApiError, ApiErrorResponse, ApiResponse } from "@/types/notion";

/**
 * API Client for communicating with the backend server.
 *
 * All requests are proxied through Next.js rewrites:
 *   /api/auth/*  -> backend /auth/*
 *   /api/notion/* -> backend /notion/*
 *   /api/health  -> backend /health
 *
 * This ensures:
 *   - Session cookies work correctly (same origin)
 *   - No CORS issues between frontend and backend
 *   - Clean separation of concerns
 */
export class ApiClientError extends Error {
  public code: ApiError["code"];
  public retryable: boolean;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiClientError";
    this.code = apiError.code;
    this.retryable = apiError.retryable;
  }
}

/**
 * Prepend /api prefix to backend routes for Next.js rewrite proxy.
 * Routes like /notion/status become /api/notion/status.
 */
function withApiPrefix(url: string): string {
  // Already has /api prefix
  if (url.startsWith("/api/")) {
    return url;
  }
  // Add /api prefix
  return `/api${url.startsWith("/") ? "" : "/"}${url}`;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Route through Next.js rewrite proxy
  const proxiedUrl = withApiPrefix(url);

  const res = await fetch(proxiedUrl, {
    ...options,
    credentials: "include", // Essential for session cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle non-JSON responses
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    if (!res.ok) {
      throw new ApiClientError({
        code: "internal_error",
        message: `Request failed with status ${res.status}`,
        retryable: res.status >= 500,
      });
    }
    return {} as T;
  }

  const body: ApiResponse<T> = await res.json();

  if ("error" in body) {
    throw new ApiClientError((body as ApiErrorResponse).error);
  }

  return (body as { data: T }).data;
}

export const apiClient = {
  get<T>(url: string): Promise<T> {
    return request<T>(url, { method: "GET" });
  },

  post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};
