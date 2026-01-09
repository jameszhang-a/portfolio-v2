"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Toast } from "./ToastProvider";
import { useToast } from "./ToastProvider";
import { XIcon } from "lucide-react";

const EXIT_ANIMATION_DURATION = 200;

export function Toast({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  const { id, message, dismissible } = toast;

  const displayMessage = useMemo(() => {
    return `${id}: ${message}`;
  }, [id, message]);

  const dismissToast = useCallback(
    (dismissId: number) => {
      setIsExiting(true);
      setTimeout(() => {
        removeToast(dismissId);
      }, EXIT_ANIMATION_DURATION);
    },
    [removeToast]
  );

  useEffect(() => {
    if (dismissible) return;

    const timer = setTimeout(() => {
      dismissToast(id);
    }, 2000);

    return () => clearTimeout(timer);
  }, [id, dismissToast, dismissible]);

  return (
    <div
      className={`bg-gray-800 text-white py-2 pl-4 pr-2 rounded-md shadow-md border border-gray-700 ${
        isExiting ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="flex flex-row items-center justify-between gap-2">
        {displayMessage}

        {dismissible && (
          <button
            onClick={() => dismissToast(id)}
            className="rounded-md p-1 cursor-pointer hover:bg-gray-700"
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
