"use client";

import { useClientMounted } from "@/hooks/useClientMounted";

type LiturgicalDayLabelProps = {
  label: string | null | undefined;
  className?: string;
};

export function LiturgicalDayLabel({ label, className = "" }: LiturgicalDayLabelProps) {
  const mounted = useClientMounted();

  if (!mounted || !label) {
    return null;
  }

  return <p className={className}>{label}</p>;
}

export default LiturgicalDayLabel;
