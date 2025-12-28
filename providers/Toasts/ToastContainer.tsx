"use client";

import { useMemo } from "react";

import { Toast } from "./Toast";
import { useToast } from "./ToastProvider";

type Props = {
  maxToasts?: number;
};

export function ToastContainer({ maxToasts = 3 }: Props) {
  const { toasts } = useToast();

  const toastElements = useMemo(() => {
    return toasts
      .slice(-maxToasts)
      .map((toast) => <Toast key={toast.id} toast={toast} />);
  }, [toasts, maxToasts]);

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-4 z-99">
      {toastElements}
    </div>
  );
}
