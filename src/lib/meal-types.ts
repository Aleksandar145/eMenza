export type MealType = "breakfast" | "lunch" | "dinner";

export type WorkingHoursRow = {
  meal: string;
  type: MealType;
  weekday: string;
  weekend: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
};

export type MealComponentSlot = "glavno_jelo" | "dodatak" | "salata" | "dezert";
