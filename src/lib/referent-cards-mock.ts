import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import { accountBalance, studentProfile } from "@/lib/dashboard-mock";
import type { RegisterDraft } from "@/lib/register-mock";

export type CardStatus = "pending_verification" | "active" | "blocked" | "expired";

export type NoteEntry = {
  id: string;
  content: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudentCard = {
  id: string;
  profileId?: string;
  cardNumber: string;
  studentName: string;
  email: string;
  indexNumber: string;
  faculty: string;
  role: "ucenik" | "student";
  status: CardStatus;
  balanceRsd: number;
  validUntil: string;
  registeredAt: string;
  activatedAt?: string;
  activatedBy?: string;
  notes?: NoteEntry[] | string;
  religion?: string;
  lastLogin?: string;
  loginCount?: number;
  ezetonStatus?: "active" | "used" | "none";
  blockedReason?: string;
  blockedUntil?: string;
};

export type ReferentActionType =
  | "activate"
  | "block"
  | "unblock"
  | "top_up"
  | "extend"
  | "refund"
  | "reversal";

export type ReferentActionLog = {
  id: string;
  cardId: string;
  action: ReferentActionType;
  detail: string;
  at: string;
  referentName: string;
  amountRsd?: number;
  /** Log akcije koja je opozvana ovim upisom. */
  reversalOfId?: string;
  /** Oznaka da je ova akcija opozvana od strane admina. */
  reversed?: boolean;
};

export type ReferentCardsState = {
  cards: StudentCard[];
  actionLogs: ReferentActionLog[];
};

export type StudentAccountSnapshot = {
  cardId: string;
  cardNumber: string;
  studentName: string;
  balanceRsd: number;
  balanceFormatted: string;
  mealsEstimate: number;
  effectiveStatus: CardStatus;
  validUntil: string;
  validUntilLabel: string;
  maskedNumber: string;
  blockedReason?: string;
  blockedUntil?: string;
};

export const REFERENT_MOCK_CREDENTIALS = {
  email: "referent@emenza.rs",
  password: "referent123",
  displayName: "Ana Referent",
};

const DEMO_VALID_UNTIL = "2026-06-30";
const DEMO_INDEX = "2021/0234";

function parseBalanceAmount(value: string) {
  const normalized = value.replace(/[^\d.,]/g, "").replace(/,/g, "");
  return Number(normalized) || 0;
}

function formatBalanceRsd(amount: number) {
  return amount.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function maskCardNumber(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length <= 4) {
    return `**** ${digits}`;
  }

  return `**** **** **** ${digits.slice(-4)}`;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardValidUntilLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function resolveEffectiveCardStatus(
  card: StudentCard,
  todayKey: string = calendarTodayDateKey,
): CardStatus {
  if (card.status === "blocked" || card.status === "pending_verification") {
    return card.status;
  }

  if (card.validUntil < todayKey) {
    return "expired";
  }

  return card.status;
}

/** Približna prosečna cena jednog obroka za AI procenu na kartici. */
export const ESTIMATED_MEAL_COST_RSD = 180;

export function estimateMealsFromBalance(balanceRsd: number) {
  return Math.max(0, Math.floor(balanceRsd / ESTIMATED_MEAL_COST_RSD));
}

function createLogEntry(
  cardId: string,
  action: ReferentActionType,
  detail: string,
  referentName: string,
  options?: { amountRsd?: number; at?: string; reversalOfId?: string; reversed?: boolean },
): ReferentActionLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cardId,
    action,
    detail,
    at: options?.at ?? new Date().toISOString(),
    referentName,
    amountRsd: options?.amountRsd,
    reversalOfId: options?.reversalOfId,
    reversed: options?.reversed,
  };
}

export function createInitialReferentCardsState(): ReferentCardsState {
  const demoBalance = parseBalanceAmount(accountBalance.amount);

  return {
    cards: [
      {
        id: "EMZ-CARD-3456",
        cardNumber: "345678901234",
        studentName: studentProfile.name.replace("Simic", "Simić"),
        email: "marija.simic@student.rs",
        indexNumber: DEMO_INDEX,
        faculty: "Fakultet organizacionih nauka",
        role: "student",
        status: "active",
        balanceRsd: demoBalance,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-02-15T10:00:00.000Z",
        activatedAt: "2026-02-15T11:30:00.000Z",
        activatedBy: REFERENT_MOCK_CREDENTIALS.displayName,
        religion: "Pravoslavlje",
        lastLogin: "2026-07-10T08:45:00.000Z",
        loginCount: 47,
        ezetonStatus: "active",
      },
      {
        id: "EMZ-CARD-7821",
        cardNumber: "782145609832",
        studentName: "Petar Petrović",
        email: "petar.petrovic@student.rs",
        indexNumber: "2022/0187",
        faculty: "Elektrotehnički fakultet",
        role: "student",
        status: "pending_verification",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-03-02T14:20:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2026-03-02T14:20:00.000Z",
        loginCount: 3,
      },
      {
        id: "EMZ-CARD-9012",
        cardNumber: "901234567890",
        studentName: "Jovana Nikolić",
        email: "jovana.nikolic@student.rs",
        indexNumber: "2023/0045",
        faculty: "Pravni fakultet",
        role: "student",
        status: "pending_verification",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-03-03T09:15:00.000Z",
        religion: "Katolicizam",
        lastLogin: "2026-03-03T09:15:00.000Z",
        loginCount: 1,
      },
{
        id: "EMZ-CARD-5567",
        cardNumber: "556789012345",
        studentName: "Marko Ilic",
        email: "marko.ilic@student.rs",
        indexNumber: "2020/0312",
        faculty: "Ekonomski fakultet",
        role: "student",
        status: "pending_verification",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-03-03T11:40:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2026-03-03T11:40:00.000Z",
        loginCount: 2,
      },
      {
        id: "EMZ-CARD-2210",
        cardNumber: "221034567801",
        studentName: "Tijana Milovanovic",
        email: "tijana.milovanovic@ucenik.rs",
        indexNumber: "2024/U008",
        faculty: "Gimnazija Jovan Jovanovic Zmaj",
        role: "ucenik",
        status: "active",
        balanceRsd: 560,
        validUntil: "2026-12-31",
        registeredAt: "2026-02-20T09:00:00.000Z",
        activatedAt: "2026-02-20T09:30:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2026-07-08T12:10:00.000Z",
        loginCount: 18,
        ezetonStatus: "used",
      },
      {
        id: "EMZ-CARD-8834",
        cardNumber: "883401234567",
        studentName: "Vuk Ristic",
        email: "vuk.ristic@student.rs",
        indexNumber: "2019/0056",
        faculty: "Fakultet tehnickih nauka",
        role: "student",
        status: "blocked",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2025-10-11T08:20:00.000Z",
        activatedAt: "2025-10-11T09:00:00.000Z",
        religion: "Agnosticizam",
        lastLogin: "2026-03-01T16:50:00.000Z",
        loginCount: 120,
        ezetonStatus: "none",
        blockedReason: "Kartica prijavljena kao izgubljena.",
        blockedUntil: "2026-09-01",
      },
      {
        id: "EMZ-CARD-4450",
        cardNumber: "445012345678",
        studentName: "Milica Jovanovic",
        email: "milica.jovanovic@student.rs",
        indexNumber: "2021/0212",
        faculty: "Medicinski fakultet",
        role: "student",
        status: "expired",
        balanceRsd: 0,
        validUntil: "2025-06-30",
        registeredAt: "2024-09-01T10:00:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2025-05-20T13:30:00.000Z",
        loginCount: 200,
      },
      {
        id: "EMZ-CARD-6631",
        cardNumber: "663190234561",
        studentName: "Nemanja Stankovic",
        email: "nemanja.stankovic@student.rs",
        indexNumber: "2022/0401",
        faculty: "Fakultet organizacionih nauka",
        role: "student",
        status: "active",
        balanceRsd: 1840,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-03-10T09:40:00.000Z",
        activatedAt: "2026-03-10T10:15:00.000Z",
        activatedBy: REFERENT_MOCK_CREDENTIALS.displayName,
        religion: "Pravoslavlje",
        lastLogin: "2026-07-06T11:20:00.000Z",
        loginCount: 32,
        ezetonStatus: "none",
      },
      {
        id: "EMZ-CARD-7742",
        cardNumber: "774201234589",
        studentName: "Ana Milosevic",
        email: "ana.milosevic@student.rs",
        indexNumber: "2023/0119",
        faculty: "Ekonomski fakultet",
        role: "student",
        status: "active",
        balanceRsd: 940,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-03-14T13:05:00.000Z",
        activatedAt: "2026-03-14T13:50:00.000Z",
        activatedBy: REFERENT_MOCK_CREDENTIALS.displayName,
        religion: "Katolicizam",
        lastLogin: "2026-07-05T09:00:00.000Z",
        loginCount: 26,
        ezetonStatus: "used",
      },
      {
        id: "EMZ-CARD-3318",
        cardNumber: "331845678902",
        studentName: "Luka Pavlovic",
        email: "luka.pavlovic@student.rs",
        indexNumber: "2021/0376",
        faculty: "Pravni fakultet",
        role: "student",
        status: "pending_verification",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-04-02T08:30:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2026-04-02T08:30:00.000Z",
        loginCount: 1,
      },
      {
        id: "EMZ-CARD-9907",
        cardNumber: "990712345678",
        studentName: "Teodora Ciric",
        email: "teodora.ciric@student.rs",
        indexNumber: "2024/0023",
        faculty: "Medicinski fakultet",
        role: "student",
        status: "pending_verification",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2026-04-05T12:10:00.000Z",
        religion: "Pravoslavlje",
        lastLogin: "2026-04-05T12:10:00.000Z",
        loginCount: 1,
      },
      {
        id: "EMZ-CARD-5528",
        cardNumber: "552867890123",
        studentName: "Boris Todorovic",
        email: "boris.todorovic@student.rs",
        indexNumber: "2019/0450",
        faculty: "Fakultet tehnickih nauka",
        role: "student",
        status: "blocked",
        balanceRsd: 0,
        validUntil: DEMO_VALID_UNTIL,
        registeredAt: "2025-11-18T15:40:00.000Z",
        activatedAt: "2025-11-18T16:05:00.000Z",
        activatedBy: REFERENT_MOCK_CREDENTIALS.displayName,
        religion: "Agnosticizam",
        lastLogin: "2026-06-21T18:30:00.000Z",
        loginCount: 88,
        ezetonStatus: "none",
        blockedReason: "Korisnik je zloupotrebljavao karticu.",
        blockedUntil: "2026-10-01",
      },
    ],
    actionLogs: [
      {
        id: "log-seed-1",
        cardId: "EMZ-CARD-3456",
        action: "activate",
        detail: "Kartica aktivirana nakon verifikacije na šalteru.",
        at: "2026-02-15T11:30:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
      },
      {
        id: "log-seed-2",
        cardId: "EMZ-CARD-3456",
        action: "top_up",
        detail: "Ručna dopuna 1.500,00 RSD — gotovina na šalteru.",
        at: "2026-03-01T10:15:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
        amountRsd: 1500,
      },
      {
        id: "log-seed-3",
        cardId: "EMZ-CARD-3456",
        action: "top_up",
        detail: "Ručna dopuna 2.000,00 RSD — gotovina.",
        at: "2026-03-02T14:30:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
        amountRsd: 2000,
      },
      {
        id: "log-seed-4",
        cardId: "EMZ-CARD-7821",
        action: "activate",
        detail: "Kartica verifikovana i aktivirana.",
        at: "2026-02-28T09:00:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
      },
      {
        id: "log-seed-5",
        cardId: "EMZ-CARD-7821",
        action: "top_up",
        detail: "Ručna dopuna 3.000,00 RSD — gotovina.",
        at: "2026-02-28T09:05:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
        amountRsd: 3000,
      },
      {
        id: "log-seed-6",
        cardId: "EMZ-CARD-3456",
        action: "top_up",
        detail: "Ručna dopuna 1.000,00 RSD — gotovina.",
        at: "2026-03-03T08:20:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
        amountRsd: 1000,
      },
      {
        id: "log-seed-7",
        cardId: "EMZ-CARD-9012",
        action: "extend",
        detail: "Važenje produženo do 30. jun 2026.",
        at: "2026-02-20T11:00:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
      },
      {
        id: "log-seed-8",
        cardId: "EMZ-CARD-5567",
        action: "top_up",
        detail: "Ručna dopuna 500,00 RSD — gotovina.",
        at: "2026-02-15T16:00:00.000Z",
        referentName: REFERENT_MOCK_CREDENTIALS.displayName,
        amountRsd: 500,
      },
    ],
  };
}

export function cloneReferentCardsState(state: ReferentCardsState): ReferentCardsState {
  return structuredClone(state);
}

export function cardMatchesQuery(card: StudentCard, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const digits = normalizeDigits(normalized);

  return (
    card.studentName.toLowerCase().includes(normalized) ||
    card.email.toLowerCase().includes(normalized) ||
    card.indexNumber.toLowerCase().includes(normalized) ||
    card.id.toLowerCase().includes(normalized) ||
    card.cardNumber.includes(digits) ||
    card.cardNumber.slice(-4).includes(digits)
  );
}

export function findCardByIdentifier(
  cards: StudentCard[],
  identifier: string,
): StudentCard | null {
  const normalized = identifier.trim().toLowerCase();
  const digits = normalizeDigits(normalized);

  return (
    cards.find(
      (card) =>
        card.id.toLowerCase() === normalized ||
        card.email.toLowerCase() === normalized ||
        card.indexNumber.toLowerCase() === normalized ||
        normalizeDigits(card.cardNumber) === digits ||
        (digits.length >= 4 && card.cardNumber.endsWith(digits)) ||
        (digits.length >= 4 && card.id.endsWith(digits)),
    ) ?? null
  );
}

export function buildStudentAccountSnapshot(card: StudentCard): StudentAccountSnapshot {
  const effectiveStatus = resolveEffectiveCardStatus(card);

  return {
    cardId: card.id,
    cardNumber: card.cardNumber,
    studentName: card.studentName,
    balanceRsd: card.balanceRsd,
    balanceFormatted: formatBalanceRsd(card.balanceRsd),
    mealsEstimate: estimateMealsFromBalance(card.balanceRsd),
    effectiveStatus,
    validUntil: card.validUntil,
    validUntilLabel: formatCardValidUntilLabel(card.validUntil),
    maskedNumber: maskCardNumber(card.cardNumber),
    blockedReason: card.blockedReason,
    blockedUntil: card.blockedUntil,
  };
}

export function buildInactiveStudentAccountSnapshot(): StudentAccountSnapshot {
  return {
    cardId: "",
    cardNumber: "",
    studentName: "",
    balanceRsd: 0,
    balanceFormatted: formatBalanceRsd(0),
    mealsEstimate: 0,
    effectiveStatus: "pending_verification",
    validUntil: "",
    validUntilLabel: "",
    maskedNumber: "**** **** **** ----",
    blockedReason: undefined,
    blockedUntil: undefined,
  };
}

export function createCardFromRegistrationDraft(
  state: ReferentCardsState,
  draft: RegisterDraft,
): ReferentCardsState {
  const digits = normalizeDigits(draft.cardNumber);
  if (!digits) {
    return state;
  }

  const existing = findCardByIdentifier(state.cards, digits);
  if (existing) {
    return state;
  }

  const cardId = `EMZ-CARD-${digits.slice(-4).padStart(4, "0")}`;
  const studentName = `${draft.firstName} ${draft.lastName}`.trim();

  const nextCard: StudentCard = {
    id: cardId,
    cardNumber: digits,
    studentName,
    email: draft.email,
    indexNumber: draft.indexNumber || DEMO_INDEX,
    faculty: draft.faculty || draft.school || "—",
    role: draft.role,
    status: "pending_verification",
    balanceRsd: 0,
    validUntil: DEMO_VALID_UNTIL,
    registeredAt: new Date().toISOString(),
  };

  return {
    ...state,
    cards: [nextCard, ...state.cards],
  };
}

export function activateCardInState(
  state: ReferentCardsState,
  cardId: string,
  referentName: string,
): ReferentCardsState {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card || card.status !== "pending_verification") {
    return state;
  }

  const now = new Date().toISOString();

  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            status: "active",
            activatedAt: now,
            activatedBy: referentName,
          }
        : entry,
    ),
    actionLogs: [
      createLogEntry(cardId, "activate", "Kartica verifikovana i aktivirana.", referentName),
      ...state.actionLogs,
    ],
  };
}

export function blockCardInState(
  state: ReferentCardsState,
  cardId: string,
  referentName: string,
  reason?: string,
  blockedUntil?: string,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? { ...entry, status: "blocked", blockedReason: reason, blockedUntil }
        : entry,
    ),
    actionLogs: [
      createLogEntry(
        cardId,
        "block",
        reason ? `Kartica blokirana: ${reason}` : "Kartica blokirana.",
        referentName,
      ),
      ...state.actionLogs,
    ],
  };
}

export function unblockCardInState(
  state: ReferentCardsState,
  cardId: string,
  referentName: string,
): ReferentCardsState {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return state;
  }

  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId ? { ...entry, status: "active" } : entry,
    ),
    actionLogs: [
      createLogEntry(cardId, "unblock", "Blokada kartice uklonjena.", referentName),
      ...state.actionLogs,
    ],
  };
}

export function manualTopUpInState(
  state: ReferentCardsState,
  cardId: string,
  amountRsd: number,
  referentName: string,
  note?: string,
): ReferentCardsState {
  if (amountRsd <= 0) {
    return state;
  }

  return adjustCardBalanceInState(
    state,
    cardId,
    amountRsd,
    `Ručna dopuna ${formatBalanceRsd(amountRsd)} RSD${note ? ` — ${note}` : ""}.`,
    referentName,
    "top_up",
  );
}

export function adjustCardBalanceInState(
  state: ReferentCardsState,
  cardId: string,
  deltaRsd: number,
  detail: string,
  actorName: string,
  action: ReferentActionType = "top_up",
): ReferentCardsState {
  if (deltaRsd === 0) {
    return state;
  }

  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return state;
  }

  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? { ...entry, balanceRsd: Math.max(0, entry.balanceRsd + deltaRsd) }
        : entry,
    ),
    actionLogs: [
      createLogEntry(cardId, action, detail, actorName, {
        amountRsd: Math.abs(deltaRsd),
      }),
      ...state.actionLogs,
    ],
  };
}

export function extendCardValidityInState(
  state: ReferentCardsState,
  cardId: string,
  newValidUntil: string,
  referentName: string,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            validUntil: newValidUntil,
            status: entry.status === "expired" ? "active" : entry.status,
          }
        : entry,
    ),
    actionLogs: [
      createLogEntry(
        cardId,
        "extend",
        `Važenje produženo do ${formatCardValidUntilLabel(newValidUntil)}.`,
        referentName,
      ),
      ...state.actionLogs,
    ],
  };
}

export type ReversalEffect =
  | { kind: "balance"; deltaRsd: number }
  | { kind: "status"; status: CardStatus }
  | { kind: "none" };

/** Odredi efekat opoziva za datu akciju. Vraća null ako akcija nije opoziva. */
export function reversalEffectFor(log: ReferentActionLog): ReversalEffect | null {
  switch (log.action) {
    case "top_up":
      return { kind: "balance", deltaRsd: -(log.amountRsd ?? 0) };
    case "refund":
      return { kind: "balance", deltaRsd: log.amountRsd ?? 0 };
    case "activate":
      return { kind: "status", status: "blocked" };
    case "block":
      return { kind: "status", status: "active" };
    case "unblock":
      return { kind: "status", status: "blocked" };
    case "extend":
      return null;
    case "reversal":
      return null;
  }
}

export function reversalDetailFor(log: ReferentActionLog): string {
  switch (log.action) {
    case "top_up":
      return `Opozvana dopuna od ${formatBalanceRsd(log.amountRsd ?? 0)} RSD.`;
    case "refund":
      return `Opozvana refundacija od ${formatBalanceRsd(log.amountRsd ?? 0)} RSD.`;
    case "activate":
      return "Opozvana aktivacija — kartica blokirana.";
    case "block":
      return "Opozvana blokada — kartica odblokirana.";
    case "unblock":
      return "Opozvano odblokiranje — kartica blokirana.";
    default:
      return "Akcija opozvana.";
  }
}

export function isActionReversible(log: ReferentActionLog): boolean {
  return reversalEffectFor(log) !== null && !log.reversed;
}

/**
 * Opoziva referentsku akciju: označava original kao opozvan, primenjuje
 * inverzni efekat na karticu i upisuje novi log akcije opoziva od strane admina.
 */
export function reverseReferentActionInState(
  state: ReferentCardsState,
  logId: string,
  adminName: string,
): ReferentCardsState {
  const original = state.actionLogs.find((entry) => entry.id === logId);
  if (!original) {
    return state;
  }

  const effect = reversalEffectFor(original);
  if (effect === null || original.reversed) {
    return state;
  }

  const now = new Date().toISOString();
  const originalWithReversed = { ...original, reversed: true };

  const reversalLog = createLogEntry(
    original.cardId,
    "reversal",
    reversalDetailFor(original),
    adminName,
    {
      amountRsd: original.amountRsd,
      at: now,
      reversalOfId: original.id,
    },
  );

  let cards = state.cards;
  if (effect.kind === "balance") {
    cards = state.cards.map((entry) =>
      entry.id === original.cardId
        ? {
            ...entry,
            balanceRsd: Math.max(0, entry.balanceRsd + effect.deltaRsd),
          }
        : entry,
    );
  } else if (effect.kind === "status") {
    cards = state.cards.map((entry) =>
      entry.id === original.cardId ? { ...entry, status: effect.status } : entry,
    );
  }

  return {
    ...state,
    cards,
    actionLogs: [
      reversalLog,
      ...state.actionLogs.map((entry) => (entry.id === logId ? originalWithReversed : entry)),
    ],
  };
}

export function migrateCardNotes(notes: NoteEntry[] | string | undefined): NoteEntry[] {
  if (!notes) return [];
  if (Array.isArray(notes)) return notes;
  return [{ id: `note-${Date.now()}`, content: notes, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
}

export function addCardNoteInState(
  state: ReferentCardsState,
  cardId: string,
  content: string,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            notes: [
              {
                id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                content,
                archived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...(Array.isArray(entry.notes) ? entry.notes : []),
            ],
          }
        : entry,
    ),
  };
}

export function archiveCardNoteInState(
  state: ReferentCardsState,
  cardId: string,
  noteId: string,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            notes: (Array.isArray(entry.notes) ? entry.notes : []).map((note) =>
              note.id === noteId ? { ...note, archived: true } : note,
            ),
          }
        : entry,
    ),
  };
}

export function updateSingleNoteInState(
  state: ReferentCardsState,
  cardId: string,
  noteId: string,
  content: string,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            notes: (Array.isArray(entry.notes) ? entry.notes : []).map((note) =>
              note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note,
            ),
          }
        : entry,
    ),
  };
}

export function getNotesForCard(card: StudentCard): NoteEntry[] {
  return Array.isArray(card.notes) ? card.notes : [];
}

export function getActiveNotesForCard(card: StudentCard): NoteEntry[] {
  return getNotesForCard(card).filter((n) => !n.archived);
}

export function getArchivedNotesForCard(card: StudentCard): NoteEntry[] {
  return getNotesForCard(card).filter((n) => n.archived);
}

export function getActiveNotesCountForCard(card: StudentCard): number {
  return getActiveNotesForCard(card).length;
}

export type UpdateCardProfilePayload = {
  studentName?: string;
  email?: string;
  role?: "ucenik" | "student";
  indexNumber?: string;
  faculty?: string;
  cardNumber?: string;
};

export function updateCardProfileDataInState(
  state: ReferentCardsState,
  cardId: string,
  data: UpdateCardProfilePayload,
): ReferentCardsState {
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.id === cardId
        ? {
            ...entry,
            ...(data.studentName !== undefined ? { studentName: data.studentName } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
            ...(data.role !== undefined ? { role: data.role } : {}),
            ...(data.indexNumber !== undefined ? { indexNumber: data.indexNumber } : {}),
            ...(data.faculty !== undefined ? { faculty: data.faculty } : {}),
            ...(data.cardNumber !== undefined ? { cardNumber: data.cardNumber } : {}),
          }
        : entry,
    ),
  };
}

export const cardStatusLabels: Record<CardStatus, string> = {
  pending_verification: "Čeka aktivaciju",
  active: "Aktivna",
  blocked: "Blokirana",
  expired: "Istekla",
};

export const validityPresets = [
  { id: "semester", label: "Kraj semestra (30. jun 2026)", dateKey: "2026-06-30" },
  { id: "school_year", label: "Kraj školskog (30. jun 2027)", dateKey: "2027-06-30" },
] as const;

export const FACULTY_OPTIONS = [
  "Fakultet organizacionih nauka",
  "Elektrotehnički fakultet",
  "Pravni fakultet",
  "Ekonomski fakultet",
  "Medicinski fakultet",
  "Filološki fakultet",
  "Arhitektonski fakultet",
  "Mašinski fakultet",
  "Građevinski fakultet",
  "Poljoprivredni fakultet",
  "Biološki fakultet",
  "Farmaceutski fakultet",
  "Fakultet političkih nauka",
  "Filozofski fakultet",
  "Fakultet likovnih umetnosti",
  "Fakultet dramskih umetnosti",
  "Fakultet sporta i fizičkog vaspitanja",
  "Saobraćajni fakultet",
  "Rudarsko-geološki fakultet",
  "Tehnološko-metalurški fakultet",
  "Šumarski fakultet",
  "Hemijski fakultet",
  "Viša elektrotehnička škola",
  "Viša medicinska škola",
] as const;

export const SCHOOL_OPTIONS = [
  "Srednja tehnička škola",
  "Gimnazija",
  "Ekonomska škola",
  "Medicinska škola",
  "Umjetnička škola",
  "Poljoprivredna škola",
  "Tehnička škola",
  "Mašinska škola",
  "Hemijsko-prehrambena škola",
  "Građevinska škola",
] as const;
