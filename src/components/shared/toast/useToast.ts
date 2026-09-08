"use client";

import { useToastContext } from "@/components/shared/toast/ToastProvider";

export function useToast() {
  const { showToast } = useToastContext();

  return {
    success: (message: string) => showToast({ message, variant: "success" }),
    error: (message: string) => showToast({ message, variant: "error" }),
    warning: (message: string) => showToast({ message, variant: "warning" }),
    info: (message: string) => showToast({ message, variant: "info" }),
  };
}
