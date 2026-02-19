"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { ConnectionState, NotionConnectionStatus } from "@/types/notion";

interface UseNotionConnectionReturn {
  state: ConnectionState;
  workspaceName: string | null;
  connectedAt: string | null;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNotionConnection(): UseNotionConnectionReturn {
  const [state, setState] = useState<ConnectionState>("loading");
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (!mountedRef.current) return;
    setState("loading");
    setError(null);

    try {
      const status = await apiClient.get<NotionConnectionStatus>("/notion/status");

      if (!mountedRef.current) return;

      if (status.connected && status.status === "active") {
        setState("connected");
        setWorkspaceName(status.workspace_name ?? null);
        setConnectedAt(status.connected_at ?? null);
      } else {
        setState("not_connected");
        setWorkspaceName(null);
        setConnectedAt(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof ApiClientError) {
        if (err.code === "reconnection_required") {
          setState("reconnection_required");
        } else {
          setState("error");
        }
        setError(err.message);
      } else {
        setState("error");
        setError("Failed to check connection status");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStatus]);

  return { state, workspaceName, connectedAt, error, refetch: fetchStatus };
}