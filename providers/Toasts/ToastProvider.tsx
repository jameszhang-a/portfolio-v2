"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type Toast = {
  id: number;
  message: string;
  dismissible?: boolean;
};

type ToastContext = {
  toasts: Toast[];
  addToast: (message: string, dismissible?: boolean) => void;
  removeToast: (id: number) => void;
};

export const ToastContext = createContext<ToastContext>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [id, setId] = useState(0);

  const addToast = useCallback(
    (message: string, dismissible?: boolean) => {
      setId((prev) => prev + 1);
      setToasts((prev) => [...prev, { id, message, dismissible }]);
    },
    [id]
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
