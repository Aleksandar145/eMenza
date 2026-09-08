"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { getReservationAdvanceDaysLabel } from "@/lib/admin-system-store";

type ReservationPolicyCollapsibleProps = {
  className?: string;
};

export function ReservationPolicyCollapsible({
  className = "",
}: ReservationPolicyCollapsibleProps) {
  useAdminSystem();
  const [isOpen, setIsOpen] = useState(false);
  const advanceLabel = getReservationAdvanceDaysLabel();

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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EFF1F4]">
          <AlertCircle aria-hidden="true" className="text-[#5055D2]" size={22} strokeWidth={1.75} />
        </div>
        <span className="min-w-0 flex-1 text-sm font-semibold text-black lg:text-base">
          Pravila rezervacije
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-black/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
          size={20}
        />
      </button>

      {isOpen ? (
        <div className="border-t border-black/5 px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
          <p className="text-sm font-light leading-relaxed text-black lg:text-base">
            Hrana se može najkasnije zakazati i otkazati{" "}
            <span className="font-semibold">24h pre serviranja.</span> Rezervacije su dostupne{" "}
            {advanceLabel}.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default ReservationPolicyCollapsible;
