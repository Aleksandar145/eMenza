"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Shield } from "lucide-react";
import { StaffShell, adminNavGroups, adminNavItems } from "@/components/staff";
import { AdminTopBarActions } from "@/components/admin/AdminTopBarActions";
import { useAdminSession } from "@/hooks/useAdminSession";
import { getPendingDishes } from "@/lib/dish-catalog-store";

type AdminLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const router = useRouter();
  const { session, logout, isReady, isAuthenticated } = useAdminSession();

  useEffect(() => {
    if (isReady && (!isAuthenticated || !session)) {
      window.location.assign("/admin/login");
    }
  }, [isReady, isAuthenticated, session]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)]">
        Učitavanje...
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-sm text-[var(--text-secondary)]">
        Preusmeravanje na prijavu...
      </div>
    );
  }

  return (
    <StaffShell
      badges={{ pendingDishes: getPendingDishes().length }}
      navGroups={adminNavGroups}
      navItems={adminNavItems}
      onLogout={() => {
        logout();
        router.replace("/admin/login");
      }}
      panel="admin"
      panelIcon={Shield}
      session={session}
      subtitle={subtitle}
      title={title}
      topBarExtra={<AdminTopBarActions />}
    >
      {children}
    </StaffShell>
  );
}

export default AdminLayout;
