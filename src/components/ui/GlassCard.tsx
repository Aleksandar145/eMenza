import type { ReactNode } from "react";

type GlassCardVariant = "glass" | "gradient";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  padding?: string;
  variant?: GlassCardVariant;
};

export function GlassCard({
  children,
  className = "",
  padding = "p-6",
  variant = "glass",
}: GlassCardProps) {
  const baseClass = variant === "glass" ? "glass-card" : "gradient-card";

  return (
    <div className={`${baseClass} ${padding} ${className}`.trim()}>
      {children}
    </div>
  );
}

export default GlassCard;
