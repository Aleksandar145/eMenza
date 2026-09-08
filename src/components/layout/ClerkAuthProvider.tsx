"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ClerkCaptcha } from "@/components/auth/ClerkCaptcha";
import { ClerkSessionWatcher } from "@/components/layout/ClerkSessionWatcher";
import { ClerkProfileImageProvider } from "@/contexts/ClerkProfileImageContext";
import { isClerkEnabledClient } from "@/lib/clerk-config";

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  if (!isClerkEnabledClient()) {
    return children;
  }

  return (
    <ClerkProvider>
      <ClerkProfileImageProvider>
        <ClerkSessionWatcher />
        <ClerkCaptcha />
        {children}
      </ClerkProfileImageProvider>
    </ClerkProvider>
  );
}
