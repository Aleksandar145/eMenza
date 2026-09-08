import type { ReactNode } from "react";
import { KuhinjaSessionProvider } from "@/components/kuhinja/KuhinjaSessionProvider";

export default function KuhinjaRootLayout({ children }: { children: ReactNode }) {
  return <KuhinjaSessionProvider>{children}</KuhinjaSessionProvider>;
}
