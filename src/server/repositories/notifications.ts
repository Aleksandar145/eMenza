import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import { studentNotifications } from "@/server/db/schema";
import type { NotificationCategory } from "@/lib/obavestenja-mock";

export type StudentNotificationRecord = {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
};

const notificationCategories = new Set<NotificationCategory>([
  "reservation",
  "payment",
  "menu",
  "system",
  "administration",
  "religion",
]);

function mapNotificationCategory(value: string): NotificationCategory {
  if (notificationCategories.has(value as NotificationCategory)) {
    return value as NotificationCategory;
  }
  return "system";
}

function formatRelativeTimeSerbian(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "Upravo sada";
  }
  if (minutes < 60) {
    return `Pre ${minutes} minuta`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Pre ${hours} ${hours === 1 ? "sat" : "sata"}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Pre ${days} ${days === 1 ? "dan" : "dana"}`;
  }

  return date.toLocaleDateString("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapNotificationRow(
  row: typeof studentNotifications.$inferSelect,
): StudentNotificationRecord {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    time: formatRelativeTimeSerbian(row.createdAt),
    category: mapNotificationCategory(row.category),
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

function ownershipFilter(profileId: string, email?: string) {
  if (email) {
    return or(
      eq(studentNotifications.profileId, profileId),
      eq(studentNotifications.email, email),
    );
  }

  return eq(studentNotifications.profileId, profileId);
}

export async function deleteStudentNotificationsByEmail(email: string, excludeProfileId?: string) {
  const db = getDb();
  if (excludeProfileId) {
    await db
      .delete(studentNotifications)
      .where(
        and(
          eq(studentNotifications.email, email),
          or(
            ne(studentNotifications.profileId, excludeProfileId),
            isNull(studentNotifications.profileId),
          ),
        ),
      );
  } else {
    await db.delete(studentNotifications).where(eq(studentNotifications.email, email));
  }
}

export async function deleteStudentNotificationsByProfileId(profileId: string) {
  const db = getDb();
  await db.delete(studentNotifications).where(eq(studentNotifications.profileId, profileId));
}

export async function appendStudentNotificationDb(input: {
  profileId?: string;
  email?: string;
  title: string;
  message: string;
  category: string;
}) {
  const db = getDb();
  await db.insert(studentNotifications).values({
    profileId: input.profileId ?? null,
    email: input.email ?? null,
    title: input.title,
    message: input.message,
    category: input.category,
  });
}

export async function listStudentNotificationsDb(profileId: string, email?: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(studentNotifications)
    .where(ownershipFilter(profileId, email))
    .orderBy(desc(studentNotifications.createdAt));

  const seen = new Set<string>();
  const merged: StudentNotificationRecord[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    merged.push(mapNotificationRow(row));
  }

  return merged;
}

export async function markStudentNotificationReadDb(
  id: string,
  profileId: string,
  email?: string,
) {
  const db = getDb();
  const [updated] = await db
    .update(studentNotifications)
    .set({ read: true })
    .where(and(eq(studentNotifications.id, id), ownershipFilter(profileId, email)))
    .returning();

  return updated ? mapNotificationRow(updated) : null;
}

export async function markAllStudentNotificationsReadDb(profileId: string, email?: string) {
  const db = getDb();
  await db
    .update(studentNotifications)
    .set({ read: true })
    .where(and(ownershipFilter(profileId, email), eq(studentNotifications.read, false)));
}
