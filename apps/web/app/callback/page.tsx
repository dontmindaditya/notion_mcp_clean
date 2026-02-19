"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { CallbackResponse } from "@/types/notion";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");

    // User denied consent
    if (oauthError === "access_denied") {
      setError(
        "You declined the Notion connection. You can connect anytime from the dashboard."
      );
      return;
    }

    if (oauthError) {
      setError(`Authorization failed: ${oauthError}`);
      return;
    }

    if (!code || !state) {
      setError("Missing authorization parameters. Please try connecting again.");
      return;
    }

    (async () => {
      try {
        await apiClient.post<CallbackResponse>("/auth/notion/callback", {
          code,
          state,
        });
        router.replace("/dashboard");
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Failed to complete connection. Please try again.");
        }
      }
    })();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        {error ? (
          <>
            <ErrorBanner
              code="internal_error"
              message={error}
              retryable
              onRetry={() => router.push("/connect")}
            />

            {/* ✅ FIXED LINK */}
            <a
              href="/"
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              ← Back to home
            </a>
          </>
        ) : (
          <LoadingSpinner
            size="lg"
            label="Connecting your Notion workspace…"
          />
        )}
      </div>
    </main>
  );
}
