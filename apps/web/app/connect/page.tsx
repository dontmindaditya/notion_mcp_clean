"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { ConnectResponse } from "@/types/notion";

export default function ConnectPage() {
  const [error, setError] = useState<string | null>(null);
  const initiated = useRef(false);

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;

    (async () => {
      try {
        const { url } = await apiClient.post<ConnectResponse>(
          "/auth/notion/connect"
        );
        window.location.href = url;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to start the connection flow. Please try again.");
        }
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        {error ? (
          <>
            <ErrorBanner
              code="internal_error"
              message={error}
              retryable
              onRetry={() => window.location.reload()}
            />

            <a
              href="/"
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              ← Back to home
            </a>
          </>
        ) : (
          <>
            <LoadingSpinner size="lg" label="Redirecting to Notion…" />
            <p className="text-xs text-neutral-600 text-center">
              You'll be asked to authorize access to your workspace.
            </p>
          </>
        )}
      </div>
    </main>
  );
}