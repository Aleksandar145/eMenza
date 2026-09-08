import { getDb } from "@/server/db";
import { profileChangeRequests } from "@/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type ProfileChangeRequestRecord = {
  id: string;
  profileId: string;
  email: string;
  studentName: string;
  cardNumber: string;
  status: "pending" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  referentName: string | null;
};

type DbRow = {
  id: string;
  profileId: string;
  email: string;
  studentName: string;
  cardNumber: string;
  status: "pending" | "resolved";
  createdAt: Date;
  resolvedAt: Date | null;
  referentName: string | null;
};

function mapRow(row: DbRow): ProfileChangeRequestRecord {
  return {
    id: row.id,
    profileId: row.profileId,
    email: row.email,
    studentName: row.studentName,
    cardNumber: row.cardNumber,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    referentName: row.referentName,
  };
}

export async function createProfileChangeRequestDb(
  profileId: string,
  email: string,
  studentName: string,
  cardNumber: string,
): Promise<ProfileChangeRequestRecord> {
  const db = getDb();
  const [row] = await db
    .insert(profileChangeRequests)
    .values({ profileId, email, studentName, cardNumber })
    .returning();
  return mapRow(row);
}

export async function listPendingProfileChangeRequestsDb(): Promise<ProfileChangeRequestRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(profileChangeRequests)
    .where(eq(profileChangeRequests.status, "pending"))
    .orderBy(desc(profileChangeRequests.createdAt));
  return rows.map(mapRow);
}

export async function listProfileChangeRequestsByProfileDb(
  profileId: string,
): Promise<ProfileChangeRequestRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(profileChangeRequests)
    .where(eq(profileChangeRequests.profileId, profileId))
    .orderBy(desc(profileChangeRequests.createdAt));
  return rows.map(mapRow);
}

export async function resolveProfileChangeRequestDb(
  requestId: string,
  referentName: string,
): Promise<ProfileChangeRequestRecord | null> {
  const db = getDb();
  const [row] = await db
    .update(profileChangeRequests)
    .set({ status: "resolved", resolvedAt: new Date(), referentName })
    .where(eq(profileChangeRequests.id, requestId))
    .returning();
  return row ? mapRow(row) : null;
}

export async function getPendingRequestByCardNumberDb(
  cardNumber: string,
): Promise<ProfileChangeRequestRecord | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(profileChangeRequests)
    .where(and(eq(profileChangeRequests.cardNumber, cardNumber), eq(profileChangeRequests.status, "pending")))
    .limit(1);
  return row ? mapRow(row) : null;
}
