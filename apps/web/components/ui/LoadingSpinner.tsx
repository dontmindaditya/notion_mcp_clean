"use client";

import { memo } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

function LoadingSpinnerComponent({ size = "md", label }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4 border-[2px]",
    md: "h-6 w-6 border-[2px]",
    lg: "h-10 w-10 border-[3px]",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeMap[size]} rounded-full border-white/20 border-t-white animate-spin`}
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && (
        <p className="text-sm text-neutral-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}

export const LoadingSpinner = memo(LoadingSpinnerComponent);
