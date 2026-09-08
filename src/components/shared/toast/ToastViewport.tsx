"use client";

import { CheckCircle2, Info, X, XCircle, AlertTriangle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: typeof CheckCircle2 }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-900",
    icon: XCircle,
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: AlertTriangle,
  },
  info: {
    container: "border-[#5055D2]/20 bg-[#5055D2]/5 text-[#1F2937]",
    icon: Info,
  },
};

type ToastViewportProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const style = variantStyles[toast.variant];
  const Icon = style.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${style.container}`}
      role="status"
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        aria-label="Zatvori obaveštenje"
        className="shrink-0 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
