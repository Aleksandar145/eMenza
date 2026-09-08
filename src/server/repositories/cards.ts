import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { RegisterDraft } from "@/lib/register-mock";
import { resolveRegisterSchoolOrFaculty } from "@/lib/register-mock";
import type {
  CardStatus,
  ReferentActionLog,
  ReferentActionType,
  ReferentCardsState,
  StudentCard,
} from "@/lib/referent-cards-mock";
import { resolveEffectiveCardStatus, reversalDetailFor, reversalEffectFor } from "@/lib/referent-cards-mock";
import { getDb } from "@/server/db";
import { cardActionLogs, ezetonTokens, profiles, studentCards, userSettings } from "@/server/db/schema";
import { appendCardActionLogDb } from "@/server/repositories/card-action-logs";
import { getUserSettingsDb, saveUserSettingsDb } from "@/server/repositories/settings";
import { notifyCardTopUp } from "@/server/lib/card-notifications";
import { MAX_TOP_UP, MIN_TOP_UP } from "@/lib/top-up-limits";

function settingsReligion(
  settings: unknown,
): string | undefined {
  if (!settings || typeof settings !== "object") {
    return undefined;
  }
  const s = settings as { profile?: { religion?: unknown } };
  const religion = s.profile?.religion;
  return typeof religion === "string" && religion.length > 0 ? religion : undefined;
}

function mapCard(
  row: typeof studentCards.$inferSelect,
  profile: typeof profiles.$inferSelect,
  token?: typeof ezetonTokens.$inferSelect | null,
  religion?: string,
): StudentCard {
  return {
    id: row.id,
    profileId: row.profileId,
    cardNumber: row.cardNumber,
    studentName: profile.displayName,
    email: profile.email,
    indexNumber: profile.indexNumber ?? "—",
    faculty: profile.faculty ?? "—",
    role: (profile.userType ?? (profile.indexNumber?.trim() ? "student" : "ucenik")) as "ucenik" | "student",
    status: row.status as CardStatus,
    balanceRsd: Number(row.balanceRsd),
    validUntil: row.validUntil,
    registeredAt: row.registeredAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString(),
    activatedBy: row.activatedBy ?? undefined,
    notes: row.notes ?? undefined,
    religion: religion ?? undefined,
    ezetonStatus: token ? (token.status as "active" | "used") : "none",
  };
}

function mapLog(row: typeof cardActionLogs.$inferSelect): ReferentActionLog {
  return {
    id: row.id,
    cardId: row.cardId,
    action: row.action as ReferentActionType,
    detail: row.detail,
    at: row.createdAt.toISOString(),
    referentName: row.referentName,
    amountRsd: row.amountRsd ? Number(row.amountRsd) : undefined,
    reversalOfId: row.reversalOfId ?? undefined,
    reversed: row.reversed,
  };
}

export async function fetchReferentCardsState(): Promise<ReferentCardsState> {
  const db = getDb();
  const rows = await db
    .select({ card: studentCards, profile: profiles, token: ezetonTokens })
    .from(studentCards)
    .innerJoin(profiles, eq(studentCards.profileId, profiles.id))
    .leftJoin(ezetonTokens, eq(studentCards.profileId, ezetonTokens.profileId))
    .orderBy(desc(studentCards.registeredAt));

  const profileIds = rows.map((r) => r.profile.id);
  const settingsRows = profileIds.length
    ? await db
        .select({ profileId: userSettings.profileId, settings: userSettings.settings })
        .from(userSettings)
        .where(inArray(userSettings.profileId, profileIds))
    : [];
  const religionByProfile = new Map(
    settingsRows
      .map((s) => [s.profileId, settingsReligion(s.settings)] as const)
      .filter(([, religion]) => religion !== undefined),
  );

  const logs = await db.select().from(cardActionLogs).orderBy(desc(cardActionLogs.createdAt));

  return {
    cards: rows.map(({ card, profile, token }) =>
      mapCard(card, profile, token, religionByProfile.get(profile.id)),
    ),
    actionLogs: logs.map(mapLog),
  };
}

export async function searchCardsDb(query: string, statusFilter?: CardStatus | "all") {
  const state = await fetchReferentCardsState();
  const normalized = query.trim().toLowerCase();
  const digits = normalized.replace(/\D/g, "");

  return state.cards.filter((card) => {
    const effectiveStatus = resolveEffectiveCardStatus(card);
    const matchesStatus =
      !statusFilter || statusFilter === "all" || effectiveStatus === statusFilter;
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

export async function getCardByIdDb(cardId: string) {
  const db = getDb();
  const [row] = await db
    .select({ card: studentCards, profile: profiles })
    .from(studentCards)
    .innerJoin(profiles, eq(studentCards.profileId, profiles.id))
    .where(eq(studentCards.id, cardId))
    .limit(1);

  return row ? mapCard(row.card, row.profile, undefined, settingsReligion(await getUserSettingsDb(row.profile.id))) : null;
}

export async function createCardFromRegistrationDb(
  profileId: string,
  draft: RegisterDraft,
  validUntil: string,
) {
  const db = getDb();
  const digits = draft.cardNumber.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Invalid card number");
  }

  const [existing] = await db
    .select()
    .from(studentCards)
    .where(eq(studentCards.cardNumber, digits))
    .limit(1);
  if (existing) {
    throw new Error("Kartica sa ovim brojem je već registrovana.");
  }

  await db
    .update(profiles)
    .set({
      displayName: `${draft.firstName} ${draft.lastName}`.trim(),
      faculty: resolveRegisterSchoolOrFaculty(draft) || null,
      indexNumber: draft.role === "student" ? draft.indexNumber ?? null : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profileId));

  const [created] = await db
    .insert(studentCards)
    .values({
      profileId,
      cardNumber: digits,
      status: "pending_verification",
      balanceRsd: "0",
      validUntil,
    })
    .returning();

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return mapCard(created, profile!);
}

export async function activateCardDb(cardId: string, referentName: string) {
  const existing = await getCardByIdDb(cardId);
  if (!existing) {
    throw new Error("Card not found or not pending");
  }

  if (existing.status === "active") {
    return existing;
  }

  if (existing.status !== "pending_verification") {
    throw new Error("Card not found or not pending");
  }

  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(studentCards)
    .set({ status: "active", activatedAt: now, activatedBy: referentName })
    .where(and(eq(studentCards.id, cardId), eq(studentCards.status, "pending_verification")))
    .returning();

  if (!updated) {
    return (await getCardByIdDb(cardId)) ?? existing;
  }

  await appendCardActionLogDb({
    cardId,
    action: "activate",
    detail: "Kartica verifikovana i aktivirana.",
    referentName,
  });
  return getCardByIdDb(cardId);
}

export async function blockCardDb(
  cardId: string,
  referentName: string,
  reason?: string,
  blockedUntil?: string,
) {
  const db = getDb();
  const setData: Partial<typeof studentCards.$inferInsert> = { status: "blocked" };
  if (reason) setData.blockedReason = reason;
  if (blockedUntil) setData.blockedUntil = blockedUntil;
  await db.update(studentCards).set(setData).where(eq(studentCards.id, cardId));
  await appendCardActionLogDb({
    cardId,
    action: "block",
    detail: reason ? `Kartica blokirana: ${reason}` : "Kartica blokirana.",
    referentName,
  });
}

export async function unblockCardDb(cardId: string, referentName: string) {
  const db = getDb();
  await db.update(studentCards).set({ status: "active" }).where(eq(studentCards.id, cardId));
  await appendCardActionLogDb({
    cardId,
    action: "unblock",
    detail: "Kartica odblokirana.",
    referentName,
  });
}

export async function reverseCardActionDb(logId: string, adminName: string): Promise<boolean> {
  const db = getDb();
  const [log] = await db
    .select()
    .from(cardActionLogs)
    .where(eq(cardActionLogs.id, logId))
    .limit(1);
  if (!log) {
    throw new Error("Akcija nije pronađena.");
  }

  const effect = reversalEffectFor({
    id: log.id,
    cardId: log.cardId,
    action: log.action as ReferentActionType,
    detail: log.detail,
    at: log.createdAt.toISOString(),
    referentName: log.referentName,
    amountRsd: log.amountRsd ? Number(log.amountRsd) : undefined,
  });

  if (effect === null || log.reversed) {
    throw new Error("Akcija nije dostupna za opoziv.");
  }

  const [card] = await db
    .select()
    .from(studentCards)
    .where(eq(studentCards.id, log.cardId))
    .limit(1);
  if (!card) {
    throw new Error("Kartica nije pronađena.");
  }

  if (effect.kind === "balance") {
    const nextBalance = Math.max(0, Number(card.balanceRsd) + effect.deltaRsd);
    await db
      .update(studentCards)
      .set({ balanceRsd: String(nextBalance) })
      .where(eq(studentCards.id, card.id));
  } else if (effect.kind === "status") {
    await db
      .update(studentCards)
      .set({ status: effect.status })
      .where(eq(studentCards.id, card.id));
  }

  await db.update(cardActionLogs).set({ reversed: true }).where(eq(cardActionLogs.id, logId));

  await appendCardActionLogDb({
    cardId: log.cardId,
    action: "reversal",
    detail: reversalDetailFor({
      id: log.id,
      cardId: log.cardId,
      action: log.action as ReferentActionType,
      detail: log.detail,
      at: log.createdAt.toISOString(),
      referentName: log.referentName,
      amountRsd: log.amountRsd ? Number(log.amountRsd) : undefined,
    }),
    referentName: adminName,
    amountRsd: log.amountRsd ? Number(log.amountRsd) : undefined,
    reversalOfId: log.id,
  });

  return true;
}

export async function manualTopUpDb(
  cardId: string,
  amountRsd: number,
  referentName: string,
  note?: string,
) {
  if (!Number.isFinite(amountRsd) || amountRsd < MIN_TOP_UP || amountRsd > MAX_TOP_UP) {
    throw new Error(`Iznos dopune mora biti između ${MIN_TOP_UP} i ${MAX_TOP_UP} RSD.`);
  }

  const db = getDb();
  const [card] = await db.select().from(studentCards).where(eq(studentCards.id, cardId)).limit(1);
  if (!card) {
    throw new Error("Card not found");
  }

  const nextBalance = Number(card.balanceRsd) + amountRsd;
  await db
    .update(studentCards)
    .set({ balanceRsd: String(nextBalance) })
    .where(eq(studentCards.id, cardId));

  await appendCardActionLogDb({
    cardId,
    action: "top_up",
    detail: note ? `Gotovinska dopuna: ${note}` : "Gotovinska dopuna na šalteru.",
    referentName,
    amountRsd,
  });

  return getCardByIdDb(cardId);
}

/**
 * Knjiži bankarsku uplatu na karticu. Namenjeno budućem bank importu / webhooku / cronu.
 * Trenutno nema pozivatelja u aplikaciji — jedna tačka za automatsko knjiženje uplata sa računa.
 */
export async function bankTopUpDb(cardId: string, amountRsd: number, reference?: string) {
  const db = getDb();
  const [card] = await db.select().from(studentCards).where(eq(studentCards.id, cardId)).limit(1);
  if (!card) {
    throw new Error("Card not found");
  }

  const nextBalance = Number(card.balanceRsd) + amountRsd;
  await db
    .update(studentCards)
    .set({ balanceRsd: String(nextBalance) })
    .where(eq(studentCards.id, cardId));

  const detail = reference
    ? `Bankarska uplata (ref: ${reference}).`
    : "Bankarska uplata sa računa.";

  await appendCardActionLogDb({
    cardId,
    action: "top_up",
    detail,
    referentName: "Sistem",
    amountRsd,
  });

  const updated = await getCardByIdDb(cardId);
  if (updated) {
    await notifyCardTopUp(
      { profileId: updated.profileId, email: updated.email },
      amountRsd,
      "bank",
    );
  }

  return updated;
}

export async function extendCardValidityDb(
  cardId: string,
  newValidUntil: string,
  referentName: string,
) {
  const db = getDb();
  await db
    .update(studentCards)
    .set({ validUntil: newValidUntil })
    .where(eq(studentCards.id, cardId));
  await appendCardActionLogDb({
    cardId,
    action: "extend",
    detail: `Važenje produženo do ${newValidUntil}.`,
    referentName,
  });
}

export async function updateCardNotesDb(cardId: string, notes: string) {
  const db = getDb();
  await db.update(studentCards).set({ notes }).where(eq(studentCards.id, cardId));
}

export type UpdateCardProfileDbPayload = {
  studentName?: string;
  email?: string;
  role?: "ucenik" | "student";
  faculty?: string;
  indexNumber?: string;
  cardNumber?: string;
};

export async function updateCardProfileDb(
  cardId: string,
  data: UpdateCardProfileDbPayload,
  referentName: string,
) {
  const db = getDb();
  const [card] = await db.select().from(studentCards).where(eq(studentCards.id, cardId)).limit(1);
  if (!card) {
    throw new Error("Kartica nije pronađena.");
  }

  const profileUpdates: Record<string, unknown> = {};
  if (data.studentName !== undefined) profileUpdates.displayName = data.studentName;
  if (data.email !== undefined) profileUpdates.email = data.email;
  if (data.role !== undefined) profileUpdates.userType = data.role;
  if (data.faculty !== undefined) profileUpdates.faculty = data.faculty;
  if (data.indexNumber !== undefined) profileUpdates.indexNumber = data.indexNumber;
  if (Object.keys(profileUpdates).length > 0) {
    profileUpdates.updatedAt = new Date();
    await db.update(profiles).set(profileUpdates).where(eq(profiles.id, card.profileId));
  }

  if (data.cardNumber !== undefined) {
    await db.update(studentCards).set({ cardNumber: data.cardNumber }).where(eq(studentCards.id, cardId));
  }

  const changedFields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([key]) => key)
    .join(", ");

  await appendCardActionLogDb({
    cardId,
    action: "activate",
    detail: `Lični podaci izmenjeni od strane referenta: ${changedFields}.`,
    referentName,
  });

  const currentSettings = await getUserSettingsDb(card.profileId);
  if (data.studentName !== undefined) {
    const parts = data.studentName.split(" ");
    currentSettings.profile.firstName = parts[0] ?? "";
    currentSettings.profile.lastName = parts.slice(1).join(" ") || "";
  }
  if (data.email !== undefined) currentSettings.profile.email = data.email;
  if (data.faculty !== undefined) currentSettings.profile.faculty = data.faculty;
  if (data.indexNumber !== undefined) currentSettings.profile.generation = data.indexNumber;
  if (data.cardNumber !== undefined) currentSettings.profile.cardNumber = data.cardNumber;
  await saveUserSettingsDb(card.profileId, currentSettings, { enforceStudentLocks: false });
}

export async function getStudentCardByProfileId(profileId: string) {
  const db = getDb();
  const [row] = await db
    .select({ card: studentCards, profile: profiles })
    .from(studentCards)
    .innerJoin(profiles, eq(studentCards.profileId, profiles.id))
    .where(eq(studentCards.profileId, profileId))
    .limit(1);

  return row ? mapCard(row.card, row.profile, undefined, settingsReligion(await getUserSettingsDb(row.profile.id))) : null;
}

export async function chargeStudentCardForZetonDepositDb(profileId: string, depositRsd: number) {
  if (depositRsd <= 0) {
    const card = await getStudentCardByProfileId(profileId);
    if (!card || card.status !== "active") {
      throw new Error("Kartica nije aktivna.");
    }
    return card;
  }

  const db = getDb();
  const card = await getStudentCardByProfileId(profileId);
  if (!card) {
    throw new Error("Kartica nije pronađena.");
  }
  if (card.status !== "active") {
    throw new Error("Kartica nije aktivna.");
  }
  if (Number(card.balanceRsd) < depositRsd) {
    throw new Error("Nedovoljno sredstava na kartici.");
  }

  await db
    .update(studentCards)
    .set({ balanceRsd: String(Number(card.balanceRsd) - depositRsd) })
    .where(eq(studentCards.id, card.id));

  const updated = await getCardByIdDb(card.id);
  if (!updated) {
    throw new Error("Kartica nije pronađena.");
  }

  return updated;
}

export async function findCardByEmailOrNumber(identifier: string) {
  const db = getDb();
  const trimmed = identifier.trim();
  const normalizedEmail = trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  const [row] = await db
    .select({ card: studentCards, profile: profiles })
    .from(studentCards)
    .innerJoin(profiles, eq(studentCards.profileId, profiles.id))
    .where(
      or(
        eq(profiles.email, normalizedEmail),
        digits.length >= 6 ? eq(studentCards.cardNumber, digits) : sql`false`,
      ),
    )
    .limit(1);

  return row ? mapCard(row.card, row.profile) : null;
}
