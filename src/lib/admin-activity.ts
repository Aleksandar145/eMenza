import { FEED_WINDOW_HOURS } from "@/lib/activity-feed-config";
import type {
  ComplaintEntry,
  FeedbackEntry,
} from "@/lib/admin-system-mock";
import type { Dish } from "@/lib/dish-catalog-mock";
import type { DailyMenuEntry } from "@/lib/kuhinja-mock";
import { mealTypeLabels } from "@/lib/kuhinja-menu-overview";
import type { MealType } from "@/lib/meal-types";
import type { ReferentActionLog, StudentCard } from "@/lib/referent-cards-mock";

export type FeedItemKind =
  | "top_up"
  | "card_activation"
  | "complaint"
  | "feedback"
  | "menu"
  | "dish";

export type FeedItem = {
  id: string;
  kind: FeedItemKind;
  title: string;
  description: string;
  /** ISO vremenska oznaka događaja. */
  at: string;
  href: string;
};

export type ActivityFeedInput = {
  now: number;
  windowHours?: number;
  actionLogs: ReferentActionLog[];
  cards: StudentCard[];
  complaintEntries: ComplaintEntry[];
  feedbackEntries: FeedbackEntry[];
  menus: DailyMenuEntry[];
  dishes: Dish[];
};

const A_FINANSIIJE_HREF = "/admin/finansije";
const A_STUDENTS_HREF = "/admin/studenti-i-ucenici";
const A_ZALBE_HREF = "/admin/zalbe";
const A_KNJIGA_UTISAKA_HREF = "/admin/knjiga-utisaka";
const A_RASPORED_HREF = "/admin/raspored";
const A_KATALOG_HREF = "/admin/katalog-jela";

function formatRsd(value: number): string {
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 }).format(value);
}

function studentNameFor(cards: StudentCard[], cardId: string): string {
  return cards.find((card) => card.id === cardId)?.studentName ?? "Nepoznat student";
}

function buildTopUpItems(input: ActivityFeedInput): FeedItem[] {
  return input.actionLogs
    .filter((log) => log.action === "top_up")
    .map((log) => ({
      id: `topup:${log.id}`,
      kind: "top_up" as const,
      title: "Gotovinska uplata",
      description: `${formatRsd(log.amountRsd ?? 0)} RSD — ${studentNameFor(input.cards, log.cardId)} (${log.referentName})`,
      at: log.at,
      href: A_FINANSIIJE_HREF,
    }));
}

function buildCardActivationItems(input: ActivityFeedInput): FeedItem[] {
  return input.actionLogs
    .filter((log) => log.action === "activate")
    .map((log) => ({
      id: `activate:${log.id}`,
      kind: "card_activation" as const,
      title: "Aktivacija kartice",
      description: `${studentNameFor(input.cards, log.cardId)} — ${log.referentName}`,
      at: log.at,
      href: A_STUDENTS_HREF,
    }));
}

function buildComplaintItems(input: ActivityFeedInput): FeedItem[] {
  return input.complaintEntries.map((entry) => ({
    id: `complaint:${entry.id}`,
    kind: "complaint" as const,
    title: "Nova žalba",
    description: `${entry.name} — ${complaintCategoryLabel(entry.category)}`,
    at: entry.submittedAt,
    href: A_ZALBE_HREF,
  }));
}

function complaintCategoryLabel(category: ComplaintEntry["category"]): string {
  switch (category) {
    case "hrana":
      return "Hrana";
    case "usluga":
      return "Usluga";
    case "higijena":
      return "Higijena";
    case "tehnicki_problem":
      return "Tehnički problem";
    case "drugo":
    default:
      return "Drugo";
  }
}

function buildFeedbackItems(input: ActivityFeedInput): FeedItem[] {
  return input.feedbackEntries.map((entry) => ({
    id: `feedback:${entry.id}`,
    kind: "feedback" as const,
    title: "Nov utisak",
    description: `${entry.name} — ocena ${entry.rating}/5`,
    at: entry.submittedAt,
    href: A_KNJIGA_UTISAKA_HREF,
  }));
}

function menuLabel(mealType: MealType, dateKey: string): string {
  return `${mealTypeLabels[mealType]} — ${dateKey}`;
}

function buildMenuItems(input: ActivityFeedInput): FeedItem[] {
  return input.menus
    .filter((menu) => Boolean(menu.updatedAt))
    .map((menu) => ({
      id: `menu:${menu.dateKey}:${menu.mealType}:${menu.updatedAt}`,
      kind: "menu" as const,
      title: menu.published ? "Raspored objavljen" : "Raspored izmenjen",
      description: menuLabel(menu.mealType, menu.dateKey),
      at: menu.updatedAt,
      href: A_RASPORED_HREF,
    }));
}

function buildDishItems(input: ActivityFeedInput): FeedItem[] {
  return input.dishes
    .filter((dish) => Boolean(dish.updatedAt))
    .map((dish) => ({
      id: `dish:${dish.id}:${dish.updatedAt}`,
      kind: "dish" as const,
      title: "Katalog jela izmenjen",
      description: `${dish.name} — ${formatRsd(dish.priceRsd)} RSD`,
      at: dish.updatedAt,
      href: A_KATALOG_HREF,
    }));
}

function withinWindow(at: string, now: number, windowHours: number): boolean {
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return now - time <= windowHours * 60 * 60 * 1000;
}

export function getRecentActivity(input: ActivityFeedInput): FeedItem[] {
  const windowHours = input.windowHours ?? FEED_WINDOW_HOURS;
  return [
    ...buildTopUpItems(input),
    ...buildCardActivationItems(input),
    ...buildComplaintItems(input),
    ...buildFeedbackItems(input),
    ...buildMenuItems(input),
    ...buildDishItems(input),
  ]
    .filter((item) => withinWindow(item.at, input.now, windowHours))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function formatFeedRelativeTime(now: number, at: string): string {
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  const diffMs = now - time;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "upravo sada";
  }
  if (minutes < 60) {
    return `pre ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `pre ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `pre ${days} d`;
}
