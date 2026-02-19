"use client";

import { useCallback, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { ApiError, NotionQueryPayload, NotionQueryResult } from "@/types/notion";

interface UseNotionDataReturn {
  data: NotionQueryResult | null;
  loading: boolean;
  error: ApiError | null;
  query: (payload: NotionQueryPayload) => Promise<void>;
  reset: () => void;
}

export function useNotionData(): UseNotionDataReturn {
  const [data, setData] = useState<NotionQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);

  const query = useCallback(async (payload: NotionQueryPayload) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.post<NotionQueryResult>(
        "/notion/query",
        payload
      );
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
      } else {
        setError({
          code: "internal_error",
          message: "An unexpected error occurred",
          retryable: true,
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, query, reset };
}