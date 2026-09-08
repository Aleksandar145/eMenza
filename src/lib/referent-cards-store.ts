import type { RegisterDraft } from "@/lib/register-mock";
import {
  fetchCardsStateFromApi,
  postCardAction,
  shouldUseCardsApi,
} from "@/lib/backend/cards-api";
import {
  activateCardInState,
  addCardNoteInState,
  adjustCardBalanceInState,
  archiveCardNoteInState,
  blockCardInState,
  buildStudentAccountSnapshot,
  cloneReferentCardsState,
  createCardFromRegistrationDraft,
  createInitialReferentCardsState,
  extendCardValidityInState,
  findCardByIdentifier,
  isActionReversible,
  manualTopUpInState,
  migrateCardNotes,
  reverseReferentActionInState,
  resolveEffectiveCardStatus,
  unblockCardInState,
  updateCardProfileDataInState,
  updateSingleNoteInState,
  type CardStatus,
  type NoteEntry,
  type ReferentCardsState,
  type StudentAccountSnapshot,
  type StudentCard,
  type UpdateCardProfilePayload,
} from "@/lib/referent-cards-mock";
import {
  buildCardActivatedCopy,
  buildCardBlockedCopy,
  buildCardExtendedCopy,
} from "@/lib/card-notification-copy";
import { getReferentReport } from "@/lib/referent-reports-mock";
import { appendStudentNotification } from "@/lib/student-notifications-store";
import { loadUserSettings, saveUserSettings } from "@/lib/user-settings-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { apiPost } from "@/lib/api/client";
import { MAX_TOP_UP, MIN_TOP_UP } from "@/lib/top-up-limits";
import { getStaffMembers, publishNotice } from "@/lib/admin-system-store";
import { recordAdminAudit } from "@/lib/audit-trail-store";

export const REFERENT_CARDS_STORAGE_KEY = "emenza-referent-cards";
export const REFERENT_CARDS_DEMO_VERSION = 6;

const emptyReferentCardsState: ReferentCardsState = { cards: [], actionLogs: [] };

type StoredReferentCards = ReferentCardsState & { demoVersion?: number };

type CardsChangeListener = () => void;

const listeners = new Set<CardsChangeListener>();

let memoryState: ReferentCardsState | null = null;
let remoteState: ReferentCardsState | null = null;

export async function syncReferentCardsFromApi() {
  if (!shouldUseCardsApi()) {
    return;
  }

  try {
    remoteState = await fetchCardsStateFromApi();
    notifyListeners();
  } catch (error) {
    console.error("[referent-cards-store] sync failed", error);
  }
}

function withDemoVersion(state: ReferentCardsState): StoredReferentCards {
  return { ...state, demoVersion: REFERENT_CARDS_DEMO_VERSION };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function persistState(state: ReferentCardsState) {
  memoryState = cloneReferentCardsState(state);

  if (typeof window !== "undefined" && !shouldUseCardsApi()) {
    localStorage.setItem(REFERENT_CARDS_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
  }

  notifyListeners();
}

export function loadReferentCardsState(): ReferentCardsState {
  if (remoteState) {
    return cloneReferentCardsState(remoteState);
  }

  if (shouldUseCardsApi()) {
    return cloneReferentCardsState(emptyReferentCardsState);
  }

  if (memoryState) {
    return cloneReferentCardsState(memoryState);
  }

  if (typeof window === "undefined") {
    return createInitialReferentCardsState();
  }

  try {
    const raw = localStorage.getItem(REFERENT_CARDS_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialReferentCardsState();
      memoryState = cloneReferentCardsState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<StoredReferentCards>;

    if (parsed.demoVersion !== REFERENT_CARDS_DEMO_VERSION) {
      const fresh = createInitialReferentCardsState();
      persistState(fresh);
      return fresh;
    }

    const initial = createInitialReferentCardsState();
    const initialCardMap = new Map(initial.cards.map((c) => [c.id, c]));
    const merged: ReferentCardsState = {
      cards: (parsed.cards ?? initial.cards).map((card) => ({
        ...(initialCardMap.get(card.id) ?? {}),
        ...card,
        notes: migrateCardNotes(card.notes),
      })),
      actionLogs: parsed.actionLogs ?? initial.actionLogs,
    };

    memoryState = cloneReferentCardsState(merged);
    return merged;
  } catch {
    const initial = createInitialReferentCardsState();
    memoryState = cloneReferentCardsState(initial);
    return initial;
  }
}

export function subscribeReferentCards(listener: CardsChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function adjustStudentCardBalance(cardId: string, deltaRsd: number, detail: string) {
  if (shouldUseCardsApi() || !cardId || deltaRsd === 0) {
    return false;
  }

  mutateState((state) => adjustCardBalanceInState(state, cardId, deltaRsd, detail, "Student portal"));
  return true;
}

function mutateState(mutator: (state: ReferentCardsState) => ReferentCardsState) {
  const current = loadReferentCardsState();
  const next = mutator(current);
  persistState(next);
  return next;
}

export function getReferentDashboardStats(state = loadReferentCardsState()) {
  const dailyReport = getReferentReport("day", undefined, state.actionLogs);

  return {
    pendingActivations: state.cards.filter(
      (card) => resolveEffectiveCardStatus(card) === "pending_verification",
    ).length,
    todayCashTopUpRsd: dailyReport.totalCashTopUpRsd,
    activeCards: state.cards.filter((card) => resolveEffectiveCardStatus(card) === "active").length,
    totalCards: state.cards.length,
  };
}

export function listPendingActivations(state = loadReferentCardsState()) {
  return state.cards.filter(
    (card) => resolveEffectiveCardStatus(card) === "pending_verification",
  );
}

export function searchCards(query: string, statusFilter?: CardStatus | "all") {
  const normalized = query.trim().toLowerCase();
  const digits = normalized.replace(/\D/g, "");

  return loadReferentCardsState().cards.filter((card) => {
    const effectiveStatus = resolveEffectiveCardStatus(card);
    const matchesStatus = !statusFilter || statusFilter === "all" || effectiveStatus === statusFilter;
    if (!matchesStatus) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return (
      card.studentName.toLowerCase().includes(normalized) ||
      card.email.toLowerCase().includes(normalized) ||
      card.indexNumber.toLowerCase().includes(normalized) ||
      card.id.toLowerCase().includes(normalized) ||
      (digits.length > 0 && card.cardNumber.includes(digits))
    );
  });
}

export function getCardById(cardId: string): StudentCard | null {
  const card = loadReferentCardsState().cards.find((c) => c.id === cardId);
  if (!card) return null;
  return { ...card, notes: migrateCardNotes(card.notes) };
}

export function resolveStudentCardForPurchase(cardId?: string, cardNumber?: string): StudentCard | null {
  if (shouldUseCardsApi()) {
    return null;
  }

  const cards = loadReferentCardsState().cards;

  if (cardId) {
    const byId = cards.find((card) => card.id === cardId);
    if (byId) {
      return byId;
    }

    const byIdentifier = findCardByIdentifier(cards, cardId);
    if (byIdentifier) {
      return byIdentifier;
    }
  }

  if (cardNumber) {
    return findCardByIdentifier(cards, cardNumber);
  }

  return null;
}

export function getActionLogsForCard(cardId: string) {
  return loadReferentCardsState().actionLogs.filter((log) => log.cardId === cardId);
}

export function getStudentAccountSnapshot(identifier: string): StudentAccountSnapshot | null {
  const card = findCardByIdentifier(loadReferentCardsState().cards, identifier);
  if (!card) {
    return null;
  }

  return buildStudentAccountSnapshot(card);
}

export function isStudentCardActive(identifier: string) {
  const snapshot = getStudentAccountSnapshot(identifier);
  return snapshot?.effectiveStatus === "active";
}

export function createCardFromRegistration(draft: RegisterDraft) {
  return mutateState((state) => createCardFromRegistrationDraft(state, draft));
}

export async function activateCard(cardId: string, referentName: string) {
  if (shouldUseCardsApi()) {
    remoteState = await postCardAction(cardId, { action: "activate", referentName });
    notifyListeners();
    return;
  }

  const card = getCardById(cardId);
  mutateState((state) => activateCardInState(state, cardId, referentName));

  if (card) {
    const copy = buildCardActivatedCopy(card.studentName);
    appendStudentNotification({
      title: copy.title,
      message: copy.message,
      category: copy.category,
      email: card.email,
    });
  }
}

export async function blockCard(cardId: string, referentName: string, reason?: string, blockedUntil?: string) {
  if (shouldUseCardsApi()) {
    remoteState = await postCardAction(cardId, {
      action: "block",
      referentName,
      reason,
      blockedUntil,
    });
    notifyListeners();
    return;
  }

  const card = getCardById(cardId);
  mutateState((state) => blockCardInState(state, cardId, referentName, reason, blockedUntil));

  if (card) {
    const copy = buildCardBlockedCopy(reason);
    appendStudentNotification({
      title: copy.title,
      message: copy.message,
      category: copy.category,
      email: card.email,
    });
  }
}

export async function unblockCard(cardId: string, referentName: string) {
  if (shouldUseCardsApi()) {
    remoteState = await postCardAction(cardId, { action: "unblock", referentName });
    notifyListeners();
    return;
  }

  mutateState((state) => unblockCardInState(state, cardId, referentName));
}

export async function manualTopUp(
  cardId: string,
  amountRsd: number,
  referentName: string,
  note?: string,
) {
  if (!Number.isFinite(amountRsd) || amountRsd < MIN_TOP_UP || amountRsd > MAX_TOP_UP) {
    throw new Error(`Iznos dopune mora biti između ${MIN_TOP_UP} i ${MAX_TOP_UP} RSD.`);
  }

  if (shouldUseCardsApi()) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase klijent nije inicijalizovan.");

    const { data: card, error: fetchError } = await supabase
      .from('student_cards')
      .select('balance_rsd')
      .eq('id', cardId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!card) throw new Error("Kartica nije pronađena u bazi.");

    const newBalance = (Number(card.balance_rsd) || 0) + Number(amountRsd);
    const { error: updateError } = await supabase
      .from('student_cards')
      .update({ balance_rsd: newBalance })
      .eq('id', cardId);
    if (updateError) throw updateError;

    const { data: logData, error: insertError } = await supabase
      .from('card_action_logs')
      .insert({
        card_id: cardId,
        action: 'top_up',
        detail: note ? `Gotovinska dopuna: ${note}` : "Gotovinska dopuna na šalteru.",
        amount_rsd: amountRsd,
        referent_name: referentName,
        created_at: new Date().toISOString()
      });
    if (insertError) throw insertError;

    await syncReferentCardsFromApi();
    notifyListeners();
    return;
  }

  mutateState((state) => manualTopUpInState(state, cardId, amountRsd, referentName, note));
}

export async function extendCardValidity(cardId: string, newValidUntil: string, referentName: string) {
  if (shouldUseCardsApi()) {
    remoteState = await postCardAction(cardId, {
      action: "extend",
      referentName,
      validUntil: newValidUntil,
    });
    notifyListeners();
    return;
  }

  const card = getCardById(cardId);
  mutateState((state) => extendCardValidityInState(state, cardId, newValidUntil, referentName));

  if (card) {
    const copy = buildCardExtendedCopy(newValidUntil);
    appendStudentNotification({
      title: copy.title,
      message: copy.message,
      category: copy.category,
      email: card.email,
    });
  }
}

function referentEmailByName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;
  const member = getStaffMembers().find(
    (m) => m.email && m.name.trim().toLowerCase() === normalized,
  );
  return member?.email;
}

export async function reverseReferentAction(logId: string, adminName: string) {
  const state = loadReferentCardsState();
  const original = state.actionLogs.find((entry) => entry.id === logId);

  if (!original || !isActionReversible(original)) {
    throw new Error("Akcija nije dostupna za opoziv.");
  }

  const card = state.cards.find((entry) => entry.id === original.cardId);
  const studentName = card?.studentName ?? "Nepoznat student";

  if (shouldUseCardsApi()) {
    await apiPost(`/api/admin/cards/reversal`, { logId, adminName });
    await syncReferentCardsFromApi();
    notifyListeners();
  } else {
    mutateState((current) => reverseReferentActionInState(current, logId, adminName));
  }

  recordAdminAudit({
    kind: "reversal",
    actionType: "admin.reversal",
    message: `Stornirana akcija „${original.action}” na kartici studenta „${studentName}”${original.amountRsd ? ` (iznos: ${original.amountRsd.toLocaleString("sr-RS")} RSD)` : ""}`,
  });

  const targetEmail = referentEmailByName(original.referentName);
  const title = "Akcija opozvana";
  const message =
    `Administracija je opozvala akciju „${original.action}” na kartici studenta ` +
    `„${studentName}”${original.amountRsd ? ` (iznos: ${original.amountRsd.toLocaleString("sr-RS")} RSD)` : ""}. ` +
    `Akciju koju ste izvršili je obradio administrator.`;

  await publishNotice({
    title,
    message,
    priority: "important",
    targets: ["referent"],
    targetEmail,
    displayMode: "popup",
  });
}

function migrateRemoteCardNotes(cardId: string): boolean {
  if (!remoteState) return false;
  const card = remoteState.cards.find((c) => c.id === cardId);
  if (!card) return false;
  if (Array.isArray(card.notes)) return false;
  remoteState = {
    ...remoteState,
    cards: remoteState.cards.map((c) =>
      c.id === cardId ? { ...c, notes: migrateCardNotes(c.notes) } : c,
    ),
  };
  return true;
}

export async function addCardNote(cardId: string, content: string) {
  if (remoteState) {
    migrateRemoteCardNotes(cardId);
    remoteState = addCardNoteInState(remoteState, cardId, content);
    notifyListeners();
    return;
  }
  mutateState((state) => addCardNoteInState(state, cardId, content));
}

export async function archiveCardNote(cardId: string, noteId: string) {
  if (remoteState) {
    migrateRemoteCardNotes(cardId);
    remoteState = archiveCardNoteInState(remoteState, cardId, noteId);
    notifyListeners();
    return;
  }
  mutateState((state) => archiveCardNoteInState(state, cardId, noteId));
}

export async function updateSingleNote(cardId: string, noteId: string, content: string) {
  if (remoteState) {
    migrateRemoteCardNotes(cardId);
    remoteState = updateSingleNoteInState(remoteState, cardId, noteId, content);
    notifyListeners();
    return;
  }
  mutateState((state) => updateSingleNoteInState(state, cardId, noteId, content));
}

export function getNoteEntriesForCard(cardId: string): NoteEntry[] {
  const card = getCardById(cardId);
  if (!card) return [];
  return migrateCardNotes(card.notes);
}

export async function updateCardProfileData(
  cardId: string,
  data: UpdateCardProfilePayload,
  referentName: string,
) {
  if (shouldUseCardsApi()) {
    remoteState = await postCardAction(cardId, { action: "update_profile", referentName, ...data });
    notifyListeners();
    return;
  }

  mutateState((state) => updateCardProfileDataInState(state, cardId, data));

  const settings = loadUserSettings();
  if (data.studentName !== undefined) {
    const parts = data.studentName.split(" ");
    settings.profile.firstName = parts[0] ?? "";
    settings.profile.lastName = parts.slice(1).join(" ") || "";
  }
  if (data.email !== undefined) settings.profile.email = data.email;
  if (data.role !== undefined) settings.profile.studentKind = data.role;
  if (data.faculty !== undefined) settings.profile.faculty = data.faculty;
  if (data.indexNumber !== undefined) settings.profile.generation = data.indexNumber;
  if (data.cardNumber !== undefined) settings.profile.cardNumber = data.cardNumber;
  saveUserSettings(settings);
}
