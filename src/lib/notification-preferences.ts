import type { MealType } from "@/lib/meal-types";
import type { NotificationCategory, NotificationItem } from "@/lib/obavestenja-mock";
import type { NotificationSettings } from "@/lib/podesavanja-mock";
import { ESTIMATED_MEAL_COST_RSD } from "@/lib/referent-cards-mock";

export const LOW_BALANCE_THRESHOLD_RSD = ESTIMATED_MEAL_COST_RSD * 3;

const reminderTimeMealMap: Record<NotificationSettings["reminderTime"], MealType> = {
  "08:00": "breakfast",
  "12:00": "lunch",
  "18:00": "dinner",
};

export function reminderTimeToMealType(
  reminderTime: NotificationSettings["reminderTime"],
): MealType {
  return reminderTimeMealMap[reminderTime];
}

export function isNotificationCategoryEnabled(
  category: NotificationCategory,
  settings: NotificationSettings,
): boolean {
  switch (category) {
    case "reservation":
      return settings.reservationReminder;
    case "payment":
      return settings.lowBalanceAlert;
    case "menu":
      return settings.promotionsAndMenu;
    case "administration":
    case "system":
      return settings.canteenAnnouncements;
    case "religion":
      return true;
    default:
      return true;
  }
}

export function filterNotificationsByPreferences(
  items: NotificationItem[],
  settings: NotificationSettings,
): NotificationItem[] {
  return items.filter((item) => isNotificationCategoryEnabled(item.category, settings));
}
