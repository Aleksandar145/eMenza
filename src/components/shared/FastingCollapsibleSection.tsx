"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { FastingChoiceStatusTone } from "@/lib/fasting-preferences";

type FastingCollapsibleSectionProps = {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  icon?: LucideIcon;
  statusLabel: string;
  statusTone?: FastingChoiceStatusTone;
  subtitle?: string;
  title: string;
};

const statusToneClasses: Record<FastingChoiceStatusTone, string> = {
  active: "bg-[#2f8f55]/10 text-[#2f8f55]",
  muted: "bg-black/5 text-black/50",
  neutral: "bg-[#5055D2]/10 text-[#5055D2]",
};

export function FastingCollapsibleSection({
  children,
  className = "",
  defaultOpen = false,
  icon: Icon,
  statusLabel,
  statusTone = "neutral",
  subtitle,
  title,
}: FastingCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#EFF1F4]/40 lg:px-5 lg:py-4"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EFF1F4]">
            <Icon aria-hidden="true" className="text-[#5055D2]" size={22} strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-black lg:text-base">{title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusToneClasses[statusTone]}`}
            >
              {statusLabel}
            </span>
          </div>
          {subtitle && !isOpen ? (
            <p className="mt-0.5 truncate text-xs font-light text-black/50 lg:text-sm">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-black/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
          size={20}
        />
      </button>

      {isOpen ? (
        <div className="border-t border-black/5 px-4 pb-4 pt-3 lg:px-5 lg:pb-5">{children}</div>
      ) : null}
    </section>
  );
}

export default FastingCollapsibleSection;
