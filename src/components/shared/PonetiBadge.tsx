type PonetiBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

export function PonetiBadge({ className = "", size = "sm" }: PonetiBadgeProps) {
  const sizeClass =
    size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#5055D2]/12 font-semibold uppercase tracking-wide text-[#5055D2] ${sizeClass} ${className}`}
    >
      Poneti
    </span>
  );
}

export default PonetiBadge;
