import type { ApiError, ApiErrorResponse, ApiResponse } from "@/types/notion";

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

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
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
