type PosnoBadgeProps = {
  className?: string;
  size?: "sm" | "md";
};

export function PosnoBadge({ className = "", size = "sm" }: PosnoBadgeProps) {
  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#2f8f55]/12 font-semibold uppercase tracking-wide text-[#2f8f55] ${sizeClass} ${className}`}
    >
      Posno
    </span>
  );
}

export default PosnoBadge;
