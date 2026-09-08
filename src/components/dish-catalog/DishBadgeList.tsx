import {
  dishBadgeLabels,
  dishBadgeStyles,
  getBadgeInlineStyle,
  isBuiltinBadge,
  type CustomBadgeDef,
  type DishBadge,
} from "@/lib/dish-catalog-mock";
import { getCustomBadgeDefs } from "@/lib/custom-badges-store";

type DishBadgeListProps = {
  badges: DishBadge[];
  limit?: number;
  size?: "sm" | "md";
  className?: string;
  customDefs?: CustomBadgeDef[];
};

export function DishBadgeList({
  badges,
  limit,
  size = "sm",
  className = "",
  customDefs,
}: DishBadgeListProps) {
  if (!Array.isArray(badges) || badges.length === 0) {
    return null;
  }

  const defs = customDefs && customDefs.length > 0 ? customDefs : getCustomBadgeDefs();
  const visible = limit ? badges.slice(0, limit) : badges;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {visible.map((badge) => {
        if (isBuiltinBadge(badge)) {
          return (
            <span
              className={`inline-flex rounded-full font-semibold ${sizeClass} ${dishBadgeStyles[badge]}`}
              key={badge}
            >
              {dishBadgeLabels[badge]}
            </span>
          );
        }
        const inlineStyle = getBadgeInlineStyle(badge, defs);
        const def = defs.find((d) => d.id === badge);
        return (
          <span
            className={`inline-flex rounded-full font-semibold ${sizeClass}`}
            key={badge}
            style={inlineStyle ?? { backgroundColor: "#e5e7eb", color: "#374151" }}
          >
            {def?.name ?? badge}
          </span>
        );
      })}
    </span>
  );
}
