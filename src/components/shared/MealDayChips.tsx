import { mealDotClass, type MealType } from "@/lib/dashboard-mock";
import { sortMealTypes } from "@/lib/meal-order";

const mealShortLabel: Record<MealType, string> = {
  breakfast: "D",
  lunch: "R",
  dinner: "V",
};

const mealAccentClass: Record<MealType, string> = {
  breakfast: "bg-[var(--meal-breakfast)]",
  lunch: "bg-[var(--meal-lunch)]",
  dinner: "bg-[var(--meal-dinner)]",
};

const mealTitle: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

type MealDayChipsProps = {
  meals: MealType[];
  isSelected?: boolean;
  variant?: "strip" | "calendar";
  className?: string;
};

export function MealDayChips({
  meals,
  isSelected = false,
  variant = "strip",
  className = "",
}: MealDayChipsProps) {
  const sortedMeals = sortMealTypes(meals);

  if (sortedMeals.length === 0) {
    return null;
  }

  const isCalendar = variant === "calendar";

  return (
    <div
      className={`flex max-w-full flex-wrap justify-center gap-0.5 ${
        isCalendar ? "px-0.5" : ""
      } ${className}`}
    >
      {sortedMeals.map((meal) => (
        <span
          className={`inline-flex shrink-0 items-center justify-center font-bold text-white ${
            isCalendar
              ? `size-[18px] rounded-md text-[9px] leading-none ${
                  isSelected
                    ? "bg-white/20 text-white ring-1 ring-white/35"
                    : `${mealAccentClass[meal]} shadow-[0_1px_2px_rgba(0,0,0,0.12)]`
                }`
              : `size-4 rounded text-[8px] ${
                  isSelected ? "bg-white/25 ring-1 ring-white/30" : mealDotClass(meal)
                }`
          }`}
          key={meal}
          title={mealTitle[meal]}
        >
          {mealShortLabel[meal]}
        </span>
      ))}
    </div>
  );
}

export default MealDayChips;
