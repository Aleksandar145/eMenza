import { formatFeedbackDate } from "@/lib/knjiga-utisaka-mock";
import type { MealComponentSlot, MealType, WorkingHoursRow } from "@/lib/meal-types";

export type { MealComponentSlot, MealType, WorkingHoursRow };

export const ADMIN_MOCK_CREDENTIALS = {
  email: "admin@emenza.rs",
  password: "admin123",
  displayName: "Admin SC",
};

export type ClosedDateEntry = {
  id: string;
  dateKey: string;
  dateKeyEnd?: string;
  label: string;
  reason: string;
  blocksReservation: boolean;
};

export type MealPriceConfig = {
  baseByMeal: Record<MealType, number>;
  slotPrices: Record<MealComponentSlot, number>;
};

export type NoticeTarget = "student" | "referent" | "kitchen" | "admin";
export type NoticePriority = "info" | "important";

export type NoticeDisplayMode = "standard" | "popup";

export type PublishedNotice = {
  id: string;
  title: string;
  message: string;
  time: string;
  priority: NoticePriority;
  target: NoticeTarget[];
  targetEmail?: string;
  publishedAt: string;
  archived: boolean;
  displayMode: NoticeDisplayMode;
  actionHref?: string;
  actionLabel?: string;
  authorName?: string;
  authorEmail?: string;
};

export type EmployeeRole = "referent" | "admin" | "kuvar" | "salter" | "moderator";

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  referent: "Referent",
  admin: "Admin",
  kuvar: "Kuvar",
  salter: "Operater saltera",
  moderator: "Moderator",
};

export function mapEmployeeRoleToKitchenRole(role: EmployeeRole): "kuvar" | "salter" | null {
  if (role === "kuvar") return "kuvar";
  if (role === "salter") return "salter";
  return null;
}

export function isKitchenEmployeeRole(role: EmployeeRole): boolean {
  return role === "kuvar" || role === "salter" || role === "moderator";
}

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  active: boolean;
  createdAt: string;
  demoPassword?: string;
  mustChangePassword?: boolean;
  supabaseUserId?: string;
  suspendedReason?: string;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
};

export type FeedbackEntry = {
  id: string;
  profileId?: string;
  initials?: string;
  name: string;
  date: string;
  message: string;
  rating: number;
  helpfulCount: number;
  disagreeCount: number;
  anonymous?: boolean;
  submittedAt: string;
  reviewed: boolean;
  adminReply?: string;
};

export type ComplaintCategory = "hrana" | "usluga" | "higijena" | "tehnicki_problem" | "drugo";

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  hrana: "Hrana",
  usluga: "Usluga",
  higijena: "Higijena",
  tehnicki_problem: "Tehnički problem",
  drugo: "Drugo",
};

export type ComplaintStatus = "novo" | "pregledano" | "reseno";

export type FileAttachment = {
  name: string;
  type: string;
  data: string;
};

export type ComplaintEntry = {
  id: string;
  profileId?: string;
  name: string;
  email: string;
  category: ComplaintCategory;
  message: string;
  date: string;
  submittedAt: string;
  status: ComplaintStatus;
  adminReply?: string;
  adminRepliedAt?: string;
  fileAttachment?: FileAttachment;
};

export type SystemAnalyticsEventType =
  | "meal_payment"
  | "reservation"
  | "pickup"
  | "cash_top_up";

export type SystemAnalyticsEvent = {
  id: string;
  at: string;
  type: SystemAnalyticsEventType;
  amountRsd?: number;
  mealType?: MealType;
  cardId?: string;
};

export type AdminSystemState = {
  workingHours: WorkingHoursRow[];
  reservationAdvanceDays: number;
  bookingCutoffHours: number;
  cancellationCutoffHours: number;
  reservationEnabled: boolean;
  closedDates: ClosedDateEntry[];
  mealPrices: MealPriceConfig;
  zetonDepositRsd: number;
  publishedNotices: PublishedNotice[];
  staff: StaffMember[];
  feedbackEntries: FeedbackEntry[];
  complaintEntries: ComplaintEntry[];
  analyticsSeed: SystemAnalyticsEvent[];
};

export const DEFAULT_WORKING_HOURS: WorkingHoursRow[] = [
  { meal: "Doručak", type: "breakfast", weekday: "08:30 - 11:00", weekend: "08:30 - 10:00", monday: "08:30 - 11:00", tuesday: "08:30 - 11:00", wednesday: "08:30 - 11:00", thursday: "08:30 - 11:00", friday: "08:30 - 11:00", saturday: "08:30 - 10:00", sunday: "08:30 - 10:00" },
  { meal: "Ručak", type: "lunch", weekday: "11:30 - 15:00", weekend: "11:30 - 13:00", monday: "11:30 - 15:00", tuesday: "11:30 - 15:00", wednesday: "11:30 - 15:00", thursday: "11:30 - 15:00", friday: "11:30 - 15:00", saturday: "11:30 - 13:00", sunday: "11:30 - 13:00" },
  { meal: "Večera", type: "dinner", weekday: "17:30 - 20:00", weekend: "17:30 - 19:00", monday: "17:30 - 20:00", tuesday: "17:30 - 20:00", wednesday: "17:30 - 20:00", thursday: "17:30 - 20:00", friday: "17:30 - 20:00", saturday: "17:30 - 19:00", sunday: "17:30 - 19:00" },
];

export const DEFAULT_MEAL_PRICES: MealPriceConfig = {
  baseByMeal: { breakfast: 65, lunch: 85, dinner: 75 },
  slotPrices: {
    glavno_jelo: 70,
    dodatak: 50,
    salata: 40,
    dezert: 40,
  },
};

type SeedFeedbackInput = {
  initials?: string;
  name: string;
  message: string;
  rating: number;
  helpfulCount: number;
  disagreeCount: number;
  anonymous?: boolean;
};

const SEED_FEEDBACK_COMMENTS: SeedFeedbackInput[] = [
  {
    initials: "JM",
    name: "Jovana M.",
    message:
      "Današnji pasulj je bio fantastičan! Velike pohvale za kuhinju, usluga je takođe bila brza uprkos gužvi.",
    rating: 5,
    helpfulCount: 12,
    disagreeCount: 1,
  },
  {
    name: "Anonimni korisnik",
    message:
      "Red je bio predugačak oko 13h, možda bi mogli da otvorite još jednu kasu u tom periodu. Hrana korektna.",
    rating: 3,
    helpfulCount: 4,
    disagreeCount: 2,
    anonymous: true,
  },
  {
    initials: "NS",
    name: "Nikola S.",
    message:
      "Pohovane tikvice su bile malo hladne, ali je bečka šnicla izvrsna kao i uvek.",
    rating: 4,
    helpfulCount: 8,
    disagreeCount: 0,
  },
  {
    name: "Anonimni korisnik",
    message: "Čistoća stolova je na zavidnom nivou. Sve pohvale za higijenu!",
    rating: 5,
    helpfulCount: 21,
    disagreeCount: 0,
    anonymous: true,
  },
];

const SEED_SUBMITTED_ATS = [
  Date.now() - 15 * 60 * 1000,
  Date.now() - 2 * 60 * 60 * 1000,
  Date.now() - 26 * 60 * 60 * 1000,
  Date.now() - 90 * 24 * 60 * 60 * 1000,
];

function seedFeedback(): FeedbackEntry[] {
  return SEED_FEEDBACK_COMMENTS.map((comment, index) => {
    const submittedAt = new Date(SEED_SUBMITTED_ATS[index]).toISOString();
    return {
      id: `fb-seed-${index + 1}`,
      ...comment,
      date: formatFeedbackDate(submittedAt),
      submittedAt,
      reviewed: index < 2,
      adminReply: index === 0 ? "Hvala Jovana! Drago nam je da vam se sviđa." : undefined,
    };
  });
}

function seedAnalytics(): SystemAnalyticsEvent[] {
  return [
    { id: "an-1", at: "2026-03-03T12:00:00.000Z", type: "meal_payment", amountRsd: 85, mealType: "lunch", cardId: "EMZ-CARD-3456" },
    { id: "an-2", at: "2026-03-03T08:30:00.000Z", type: "meal_payment", amountRsd: 65, mealType: "breakfast", cardId: "EMZ-CARD-7821" },
    { id: "an-3", at: "2026-03-03T14:00:00.000Z", type: "cash_top_up", amountRsd: 1000, cardId: "EMZ-CARD-3456" },
    { id: "an-4", at: "2026-03-02T13:00:00.000Z", type: "meal_payment", amountRsd: 85, mealType: "lunch", cardId: "EMZ-CARD-9012" },
    { id: "an-5", at: "2026-03-02T19:00:00.000Z", type: "meal_payment", amountRsd: 75, mealType: "dinner", cardId: "EMZ-CARD-3456" },
    { id: "an-6", at: "2026-03-02T11:00:00.000Z", type: "reservation", mealType: "lunch", cardId: "EMZ-CARD-5567" },
    { id: "an-7", at: "2026-03-01T12:30:00.000Z", type: "pickup", mealType: "lunch", cardId: "EMZ-CARD-3456" },
    { id: "an-8", at: "2026-03-01T10:15:00.000Z", type: "cash_top_up", amountRsd: 1500, cardId: "EMZ-CARD-3456" },
    { id: "an-9", at: "2026-02-28T13:00:00.000Z", type: "meal_payment", amountRsd: 85, mealType: "lunch", cardId: "EMZ-CARD-7821" },
    { id: "an-10", at: "2026-02-27T08:00:00.000Z", type: "meal_payment", amountRsd: 65, mealType: "breakfast", cardId: "EMZ-CARD-3456" },
    { id: "an-11", at: "2026-02-26T18:00:00.000Z", type: "meal_payment", amountRsd: 75, mealType: "dinner", cardId: "EMZ-CARD-9012" },
    { id: "an-12", at: "2026-02-25T14:30:00.000Z", type: "cash_top_up", amountRsd: 2000, cardId: "EMZ-CARD-7821" },
  ];
}

function seedComplaints(): ComplaintEntry[] {
  const now = Date.now();
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60 * 1000).toISOString();

  const items: Array<{
    name: string;
    email: string;
    category: ComplaintCategory;
    message: string;
    status: ComplaintStatus;
    reply?: string;
    repliedAt?: string;
  }> = [
    {
      name: "Ana Pavlović",
      email: "ana.pavlovic@student.rs",
      category: "hrana",
      message: "Danas je gulaš bio hladan u 13:30, iako je ručak krenuo u 12:00. Molim da se proveri roštilj/kotel.",
      status: "reseno",
      reply: "Izvinjavamo se. Zamenili smo kotao i proverili temperaturu — od sutra neće biti isto.",
      repliedAt: at(180),
    },
    {
      name: "Bojan Kovačević",
      email: "bojan.kovacevic@student.rs",
      category: "usluga",
      message: "Red je bio ogroman oko 13:00. Traje preko 20 minuta, dve kase su radile.",
      status: "pregledano",
    },
    {
      name: "Marija Lukić",
      email: "marija.lukic@student.rs",
      category: "higijena",
      message: "Na podu u blizini polu-šaltera bila je mrlja od sosa više sati. Higijena bi mogla da bude bolja.",
      status: "novo",
    },
    {
      name: "Stefan Đorđević",
      email: "stefan.djordjevic@student.rs",
      category: "tehnicki_problem",
      message: "Kartica se ne čita na čitaču kod šaltera broj 2, iako je aktivna. Proveriti uređaj.",
      status: "pregledano",
    },
    {
      name: "Jelena Radović",
      email: "jelena.radovic@student.rs",
      category: "hrana",
      message: "Danas je salata bila bez preliva i skroz jednolična. Nadam se da će sutra biti bolja.",
      status: "novo",
    },
  ];

  return items.map((item, index) => {
    const submittedAt = at((index + 1) * 60 * 6);
    return {
      id: `complaint-seed-${index + 1}`,
      name: item.name,
      email: item.email,
      category: item.category,
      message: item.message,
      date: formatFeedbackDate(submittedAt),
      submittedAt,
      status: item.status,
      adminReply: item.reply,
      adminRepliedAt: item.repliedAt,
    };
  });
}

export function createInitialAdminSystemState(): AdminSystemState {
  return {
    workingHours: structuredClone(DEFAULT_WORKING_HOURS),
    reservationAdvanceDays: 4,
    bookingCutoffHours: 24,
    cancellationCutoffHours: 24,
    reservationEnabled: true,
    closedDates: [
      {
        id: "closed-1",
        dateKey: "2026-03-08",
        label: "8. mart 2026.",
        reason: "Planirano održavanje kuhinje",
        blocksReservation: true,
      },
    ],
    mealPrices: structuredClone(DEFAULT_MEAL_PRICES),
    zetonDepositRsd: 200,
    publishedNotices: [
      {
        id: "notice-seed-1",
        title: "Radno vreme restorana",
        message: "Subotom restoran radi do 15:00 zbog planiranog održavanja kuhinje.",
        time: "3. mart 2026.",
        priority: "important",
        target: ["student"],
        publishedAt: "2026-03-03T08:00:00.000Z",
        archived: false,
        displayMode: "standard",
      },
      {
        id: "notice-seed-2",
        title: "Ažurirana procedura aktivacije",
        message: "Od 1. marta obavezno proverite broj indeksa pre aktivacije kartice.",
        time: "1. mart 2026.",
        priority: "info",
        target: ["referent"],
        publishedAt: "2026-03-01T09:00:00.000Z",
        archived: false,
        displayMode: "standard",
      },
      {
        id: "notice-seed-3",
        title: "Higijenska inspekcija 10. marta",
        message: "Pripremiti dokumentaciju i evidenciju temperature hladnjaka do 9. marta.",
        time: "3. mart 2026.",
        priority: "important",
        target: ["kitchen"],
        publishedAt: "2026-03-03T07:30:00.000Z",
        archived: false,
        displayMode: "standard",
      },
      {
        id: "notice-seed-4",
        title: "Novi format etiketa za alergene",
        message: "Od 15. marta koristiti ažurirane etikete sa oznakom alergena na svim jelima.",
        time: "28. februar 2026.",
        priority: "info",
        target: ["kitchen"],
        publishedAt: "2026-02-28T10:00:00.000Z",
        archived: false,
        displayMode: "standard",
      },
    ],
    staff: [
      {
        id: "staff-1",
        name: "Ana Referent",
        email: "referent@emenza.rs",
        role: "referent",
        active: true,
        createdAt: "2026-01-15T10:00:00.000Z",
      },
      {
        id: "staff-2",
        name: "Marko Jovanović",
        email: "marko.j@emenza.rs",
        role: "kuvar",
        active: true,
        createdAt: "2026-02-01T10:00:00.000Z",
      },
      {
        id: "staff-3",
        name: ADMIN_MOCK_CREDENTIALS.displayName,
        email: ADMIN_MOCK_CREDENTIALS.email,
        role: "admin",
        active: true,
        createdAt: "2026-01-01T10:00:00.000Z",
      },
      {
        id: "staff-4",
        name: "Nikola Petrović",
        email: "nikola.p@emenza.rs",
        role: "kuvar",
        active: true,
        createdAt: "2026-02-10T10:00:00.000Z",
      },
      {
        id: "staff-5",
        name: "Jelena Stanković",
        email: "jelena.s@emenza.rs",
        role: "moderator",
        active: true,
        createdAt: "2026-02-12T10:00:00.000Z",
      },
      {
        id: "staff-6",
        name: "Stefan Đorđević",
        email: "stefan.d@emenza.rs",
        role: "salter",
        active: true,
        createdAt: "2026-02-15T10:00:00.000Z",
      },
      {
        id: "staff-7",
        name: "Milica Jovanović",
        email: "milica.j@emenza.rs",
        role: "referent",
        active: true,
        createdAt: "2026-02-20T10:00:00.000Z",
      },
      {
        id: "staff-8",
        name: "Ivana Kovačević",
        email: "ivana.k@emenza.rs",
        role: "salter",
        active: false,
        createdAt: "2026-01-25T10:00:00.000Z",
        suspendedReason: "Odobreno odsustvo",
      },
    ],
    feedbackEntries: seedFeedback(),
    complaintEntries: seedComplaints(),
    analyticsSeed: seedAnalytics(),
  };
}

export function cloneAdminSystemState(state: AdminSystemState): AdminSystemState {
  return structuredClone(state);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "upravo";
  if (seconds < 60) return `pre ${seconds} sekundi`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "pre 1 minut";
  if (minutes < 60) return `pre ${minutes} minuta`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "pre 1 sat";
  if (hours < 24) return `pre ${hours} sata`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "pre 1 dan";
  if (days < 30) return `pre ${days} dana`;
  const months = Math.floor(days / 30);
  if (months === 1) return "pre 1 mesec";
  return `pre ${months} meseci`;
}
