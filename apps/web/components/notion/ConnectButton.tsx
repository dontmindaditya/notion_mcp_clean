"use client";

import { memo, useCallback, useState } from "react";
import Image from "next/image";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ConnectResponse } from "@/types/notion";

interface ConnectButtonProps {
  className?: string;
  variant?: "primary" | "compact" | "card";
}

function ConnectButtonComponent({
  className = "",
  variant = "primary",
}: ConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { url } = await apiClient.post<ConnectResponse>(
        "/auth/notion/connect"
      );
      // Full-page redirect to Notion OAuth
      window.location.href = url;
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to initiate connection");
      }
    }
  }, []);

  if (variant === "compact") {
    return (
      <button
        onClick={handleConnect}
        disabled={loading}
        className={`inline-flex items-center gap-2 bg-white text-black font-medium text-sm px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Image src="/notion.png" alt="" width={16} height={16} />
        )}
        <span>Connect</span>
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full rounded-2xl bg-white text-black font-bold text-base py-5 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Connect Notion"}
        </button>
        {error && (
          <p className="text-sm text-neutral-400 text-center">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="group relative flex items-center gap-3 bg-white text-black font-semibold text-base px-8 py-4 rounded-2xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
      >
        {loading ? (
          <>
            <div className="h-5 w-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <Image
              src="/notion.png"
              alt="Notion"
              width={20}
              height={20}
              className="group-hover:scale-110 transition-transform"
            />
            <span>Connect Notion</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-neutral-400 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export const ConnectButton = memo(ConnectButtonComponent);
