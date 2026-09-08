import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { ezetonTokens, studentCards } from "@/server/db/schema";

export type EzetonTokenRecord = {
  id: string;
  profileId: string;
  tokenCode: string;
  status: "active" | "used";
  mealName: string | null;
  mealSlot: string | null;
  claimedAt: string | null;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapToken(row: typeof ezetonTokens.$inferSelect): EzetonTokenRecord {
  return {
    id: row.id,
    profileId: row.profileId,
    tokenCode: row.tokenCode,
    status: row.status as "active" | "used",
    mealName: row.mealName,
    mealSlot: row.mealSlot,
    claimedAt: row.claimedAt?.toISOString() ?? null,
    consumedAt: row.consumedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getStudentTokenDb(profileId: string): Promise<EzetonTokenRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(ezetonTokens)
    .where(eq(ezetonTokens.profileId, profileId))
    .limit(1);
  return row ? mapToken(row) : null;
}

export async function getTokenByCodeDb(tokenCode: string): Promise<EzetonTokenRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(ezetonTokens)
    .where(eq(ezetonTokens.tokenCode, tokenCode))
    .limit(1);
  return row ? mapToken(row) : null;
}

export async function purchaseTokenDb(
  profileId: string,
  tokenCode: string,
  depositRsd: number,
): Promise<EzetonTokenRecord> {
  const db = getDb();

  const existing = await getStudentTokenDb(profileId);
  if (existing) {
    throw new Error("Već imate aktiviran žeton.");
  }

  if (depositRsd > 0) {
    const [card] = await db
      .select()
      .from(studentCards)
      .where(eq(studentCards.profileId, profileId))
      .limit(1);

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
  }

  const [created] = await db
    .insert(ezetonTokens)
    .values({
      profileId,
      tokenCode,
      status: "active",
      claimedAt: new Date(),
    })
    .returning();

  return mapToken(created);
}

export async function consumeTokenDb(
  profileId: string,
  mealName?: string | null,
  mealSlot?: string | null,
): Promise<EzetonTokenRecord | null> {
  const db = getDb();
  const token = await getStudentTokenDb(profileId);
  if (!token) {
    return null;
  }
  if (token.status !== "active") {
    return null;
  }

  const [updated] = await db
    .update(ezetonTokens)
    .set({
      status: "used",
      mealName: mealName ?? token.mealName,
      mealSlot: mealSlot ?? token.mealSlot,
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ezetonTokens.id, token.id))
    .returning();

  return updated ? mapToken(updated) : null;
}

export async function returnTokenDb(profileId: string): Promise<EzetonTokenRecord | null> {
  const db = getDb();
  const token = await getStudentTokenDb(profileId);
  if (!token || token.status !== "used") {
    return null;
  }

  const [updated] = await db
    .update(ezetonTokens)
    .set({
      status: "active",
      consumedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(ezetonTokens.id, token.id))
    .returning();

  return updated ? mapToken(updated) : null;
}

export async function reactivateTokenDb(
  profileId: string,
  depositRsd: number,
): Promise<EzetonTokenRecord> {
  const db = getDb();
  const token = await getStudentTokenDb(profileId);
  if (!token) {
    throw new Error("Nemate žeton.");
  }
  if (token.status !== "used") {
    throw new Error("Žeton nije iskorišćen.");
  }

  if (depositRsd > 0) {
    const [card] = await db
      .select()
      .from(studentCards)
      .where(eq(studentCards.profileId, profileId))
      .limit(1);

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
  }

  const [updated] = await db
    .update(ezetonTokens)
    .set({
      status: "active",
      consumedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(ezetonTokens.id, token.id))
    .returning();

  return mapToken(updated);
}
