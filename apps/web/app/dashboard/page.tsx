"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useNotionConnection } from "@/hooks/useNotionConnection";
import { ConnectionStatus } from "@/components/notion/ConnectionStatus";
import { ConnectButton } from "@/components/notion/ConnectButton";
import { DisconnectButton } from "@/components/notion/DisconnectButton";
import { NotionDataView } from "@/components/notion/NotionDataView";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessToast } from "@/components/ui/SuccessToast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DashboardPage() {
  const router = useRouter();
  const { state, workspaceName, connectedAt, error, refetch } = useNotionConnection();
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDisconnected = useCallback(() => {
    setToast("Notion disconnected successfully");
    refetch();
  }, [refetch]);

  if (!mounted || state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner size="lg" label="Loading dashboard…" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <SuccessToast message={toast} onClose={() => setToast(null)} />
      )}

      {/* Modern Glass Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
              <Image src="/logo.png" alt="Logo" width={20} height={20} />
            </div>
            <span className="text-sm font-bold tracking-tight uppercase">
              Notion MCP
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus
              state={state}
              workspaceName={workspaceName}
              connectedAt={connectedAt}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        
        {/* Error Handling Section */}
        <div className="space-y-4 mb-8">
          {state === "reconnection_required" && (
            <ErrorBanner
              code="reconnection_required"
              message="Your Notion connection has expired. Please reconnect to continue."
              retryable
              onRetry={() => router.push("/connect")}
            />
          )}

          {state === "error" && error && (
            <ErrorBanner
              code="internal_error"
              message={error}
              retryable
              onRetry={refetch}
            />
          )}
        </div>

        {/* Not Connected State - Tall Card Design */}
        {(state === "not_connected" || state === "reconnection_required") && (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="w-full max-w-md bg-neutral-900/40 border border-neutral-800 rounded-[32px] p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-8 border border-neutral-700">
                <Image src="/notion.png" alt="Notion" width={32} height={32} className="opacity-50" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                {state === "reconnection_required" ? "Reconnect Workspace" : "Get Started"}
              </h2>
              <p className="text-neutral-500 text-sm mb-10 leading-relaxed">
                {state === "reconnection_required"
                  ? "Your session has expired. Re-authenticate to keep using your workspace tools."
                  : "Connect your workspace to enable AI-powered search and data querying."}
              </p>
              <ConnectButton className="w-full py-4 rounded-xl" />
            </div>
          </div>
        )}

        {/* Connected State - Dashboard Grid */}
        {state === "connected" && (
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Dashboard Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Your Workspace</h2>
                <p className="text-neutral-400 mt-2 text-base">
                  Viewing data from <span className="text-white font-medium">{workspaceName}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                   onClick={() => refetch()}
                   className="px-4 py-2 text-sm font-medium border border-neutral-800 rounded-xl hover:bg-neutral-900 transition"
                >
                  Refresh Data
                </button>
                <DisconnectButton onDisconnected={handleDisconnected} />
              </div>
            </div>

            {/* Main Data View Card */}
            <div className="bg-[#0A0A0A] border border-neutral-800 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="p-1">
                <NotionDataView />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <footer className="mt-auto py-6 border-t border-white/5 text-center">
        <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">
          Secure End-to-End Encryption Enabled
        </p>
      </footer>
    </main>
  );
}