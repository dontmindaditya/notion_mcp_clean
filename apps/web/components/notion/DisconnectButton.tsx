"use client";

import { memo, useCallback, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { DisconnectResponse } from "@/types/notion";

interface DisconnectButtonProps {
  onDisconnected?: () => void;
}

function DisconnectButtonComponent({ onDisconnected }: DisconnectButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post<DisconnectResponse>("/notion/disconnect");
      onDisconnected?.();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to disconnect");
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }, [onDisconnected]);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-2"
      >
        Disconnect Notion
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
      <p className="text-sm text-neutral-300">
        This will remove access to your Notion workspace. You can reconnect
        anytime.
      </p>
      {error && <p className="text-xs text-neutral-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Disconnecting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-sm text-neutral-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export const DisconnectButton = memo(DisconnectButtonComponent);