"use client";

import { memo } from "react";
import type { ConnectionState } from "@/types/notion";

interface ConnectionStatusProps {
  state: ConnectionState;
  workspaceName: string | null;
  connectedAt: string | null;
}

function ConnectionStatusComponent({
  state,
  workspaceName,
  connectedAt,
}: ConnectionStatusProps) {
  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 rounded-xl border border-neutral-800 animate-pulse">
        <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        <div className="h-4 w-32 bg-neutral-800 rounded" />
      </div>
    );
  }

  const statusConfig: Record<
    Exclude<ConnectionState, "loading">,
    { dot: string; label: string; sub?: string }
  > = {
    connected: {
      dot: "bg-white",
      label: workspaceName ?? "Notion Connected",
      sub: connectedAt
        ? `Connected ${new Date(connectedAt).toLocaleDateString()}`
        : undefined,
    },
    not_connected: {
      dot: "bg-neutral-600",
      label: "Not connected",
      sub: "Connect your Notion workspace to get started",
    },
    error: {
      dot: "bg-neutral-500",
      label: "Connection error",
      sub: "Something went wrong with the connection",
    },
    reconnection_required: {
      dot: "bg-neutral-400 animate-pulse",
      label: "Reconnection needed",
      sub: "Your Notion connection has expired",
    },
  };

  const config = statusConfig[state];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 rounded-xl border border-neutral-800">
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${config.dot}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {config.label}
        </p>
        {config.sub && (
          <p className="text-xs text-neutral-500 truncate">{config.sub}</p>
        )}
      </div>
    </div>
  );
}

export const ConnectionStatus = memo(ConnectionStatusComponent);
