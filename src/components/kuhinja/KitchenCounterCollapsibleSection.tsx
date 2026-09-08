"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { StaffCard } from "@/components/staff";

type KitchenCounterCollapsibleSectionProps = {
  storageKey: string;
  title: string;
  mini: ReactNode;
  children: ReactNode;
  className?: string;
};

function readCollapsedState(storageKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return sessionStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function writeCollapsedState(storageKey: string, collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, collapsed ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function KitchenCounterCollapsibleSection({
  storageKey,
  title,
  mini,
  children,
  className = "",
}: KitchenCounterCollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(() => readCollapsedState(storageKey));

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      writeCollapsedState(storageKey, next);
      return next;
    });
  }

  return (
    <StaffCard className={`overflow-hidden ${className}`} padding="none">
      <button
        aria-expanded={!collapsed}
        className={`flex w-full items-center gap-3 text-left transition-colors hover:bg-black/[0.02] ${
          collapsed ? "px-4 py-2.5" : "border-b border-[var(--card-border)] px-5 py-3"
        }`}
        onClick={toggleCollapsed}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          {collapsed ? (
            <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">{mini}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-black/40 transition-transform ${collapsed ? "" : "rotate-180"}`}
          size={18}
        />
      </button>

      {!collapsed ? <div className="p-5">{children}</div> : null}
    </StaffCard>
  );
}

export default KitchenCounterCollapsibleSection;
