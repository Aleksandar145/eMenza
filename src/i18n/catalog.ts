import type { MealType } from "@/lib/meal-types";
import type { AppLanguage } from "@/i18n/types";
import { getMessages } from "@/i18n/messages";
import { resolveMessage } from "@/i18n/translate";

export function getMealTypeLabel(language: AppLanguage, mealType: MealType): string {
  const key =
    mealType === "breakfast" ? "meals.breakfast" : mealType === "lunch" ? "meals.lunch" : "meals.dinner";
  return resolveMessage(getMessages(language), key);
}

export function getTimeGreetingLabel(language: AppLanguage, hour: number): string {
  const messages = getMessages(language);
  if (hour < 12) {
    return resolveMessage(messages, "meals.greetingMorning");
  }
  if (hour < 18) {
    return resolveMessage(messages, "meals.greetingDay");
  }
  return resolveMessage(messages, "meals.greetingEvening");
}
