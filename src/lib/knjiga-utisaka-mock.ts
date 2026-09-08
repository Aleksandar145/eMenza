export function formatFeedbackDate(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMinutes < 1) return "Upravo sada";
  if (diffMinutes < 60) return `Pre ${diffMinutes} minuta`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    if (diffHours === 1) return "Pre 1 sat";
    if (diffHours <= 4) return `Pre ${diffHours} sata`;
    return `Pre ${diffHours} sati`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Juče";

  return date.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type FeedbackComment = {
  id: string;
  initials?: string;
  name: string;
  date: string;
  message: string;
  rating: number;
  helpfulCount: number;
  disagreeCount?: number;
  anonymous?: boolean;
  profileId?: string;
  reviewed?: boolean;
  adminReply?: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
};

export const feedbackOverview = {
  averageRating: {
    label: "Prosečna ocena",
    value: "4.2",
    detail: "↑ +0,3 ovog meseca",
  },
  totalFeedback: {
    label: "Ukupno utisaka",
    value: "1.248",
    detail: "Od početka godine",
  },
};

export const feedbackComments: FeedbackComment[] = [
  {
    id: "mock-fb-1",
    initials: "JM",
    name: "Jovana M.",
    date: "Pre 15 minuta",
    message:
      "Današnji pasulj je bio fantastičan! Velike pohvale za kuhinju, usluga je takođe bila brza uprkos gužvi.",
    rating: 5,
    helpfulCount: 12,
    disagreeCount: 1,
  },
  {
    id: "mock-fb-2",
    name: "Anonimni korisnik",
    date: "Pre 2 sata",
    message:
      "Red je bio predugačak oko 13h, možda bi mogli da otvorite još jednu kasu u tom periodu. Hrana korektna.",
    rating: 3,
    helpfulCount: 4,
    disagreeCount: 2,
    anonymous: true,
  },
  {
    id: "mock-fb-3",
    initials: "NS",
    name: "Nikola S.",
    date: "Juče, 14:20",
    message:
      "Pohovane tikvice su bile malo hladne, ali je bečka šnicla izvrsna kao i uvek.",
    rating: 4,
    helpfulCount: 8,
    disagreeCount: 0,
  },
  {
    id: "mock-fb-4",
    name: "Anonimni korisnik",
    date: "24. Maj 2024.",
    message: "Čistoća stolova je na zavidnom nivou. Sve pohvale za higijenu!",
    rating: 5,
    helpfulCount: 21,
    disagreeCount: 0,
    anonymous: true,
  },
];
