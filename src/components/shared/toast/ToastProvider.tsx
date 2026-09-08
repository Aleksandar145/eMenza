"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastViewport, type ToastItem, type ToastVariant } from "@/components/shared/toast/ToastViewport";

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = "info", durationMs = DEFAULT_DURATION_MS }: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next: ToastItem = { id, message, variant };

      setToasts((current) => [...current, next]);

      const timer = setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
