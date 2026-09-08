"use client";

import { EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";

const DEFAULT_MESSAGE = "Ove kartice će biti vidljive nakon aktivacije kartice.";

type MealBookingLockedSectionProps = {
  children: ReactNode;
  message?: string;
  className?: string;
  variant?: "default" | "compact";
};

export function MealBookingLockedSection({
  children,
  message = DEFAULT_MESSAGE,
  className = "",
  variant = "default",
}: MealBookingLockedSectionProps) {
  const { showCardLock } = useCardAccess();
  const isCompact = variant === "compact";

  if (!showCardLock) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden rounded-[20px] ${className}`.trim()}>
      <div aria-hidden="true" className="pointer-events-none select-none blur-[4px] opacity-55">
        {children}
      </div>
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-white/65 px-3 backdrop-blur-[1px]"
        role="status"
      >
        <div
          className={`flex items-center justify-center rounded-full bg-[#5055D2]/8 ${
            isCompact ? "size-8" : "size-9"
          }`}
        >
          <EyeOff
            aria-hidden="true"
            className="text-[#5055D2]/70"
            size={isCompact ? 16 : 18}
          />
        </div>
        <p
          className={`max-w-[200px] text-center font-semibold leading-snug text-black/70 ${
            isCompact ? "text-[11px]" : "text-xs"
          }`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export default MealBookingLockedSection;
