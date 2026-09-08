"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useKuhinjaSession, type KuhinjaSession } from "@/hooks/useKuhinjaSession";

type KuhinjaSessionContextValue = {
  session: KuhinjaSession | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<KuhinjaSession | false>;
  logout: () => Promise<void>;
};

const KuhinjaSessionContext = createContext<KuhinjaSessionContextValue | null>(null);

export function KuhinjaSessionProvider({ children }: { children: ReactNode }) {
  const value = useKuhinjaSession();

  return <KuhinjaSessionContext.Provider value={value}>{children}</KuhinjaSessionContext.Provider>;
}

export function useKuhinjaSessionContext() {
  const context = useContext(KuhinjaSessionContext);
  if (!context) {
    throw new Error("useKuhinjaSessionContext must be used within KuhinjaSessionProvider");
  }
  return context;
}
