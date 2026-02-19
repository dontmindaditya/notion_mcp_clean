"use client";

import { memo, useEffect, useState } from "react";

interface SuccessToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

function SuccessToastComponent({
  message,
  duration = 3000,
  onClose,
}: SuccessToastProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setExiting(true);
    }, duration - 300);

    const removeTimer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-white text-black px-5 py-3 rounded-xl shadow-2xl shadow-white/5 text-sm font-medium transition-all duration-300 ${
        exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      }`}
      role="status"
    >
      <div className="flex items-center gap-2">
        <span className="text-black">✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

export const SuccessToast = memo(SuccessToastComponent);
