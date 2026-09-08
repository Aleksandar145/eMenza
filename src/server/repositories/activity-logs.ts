import { getDb } from "@/server/db";
import { activityLogs, profiles } from "@/server/db/schema";
import { desc, eq, and, count, sql, inArray } from "drizzle-orm";
import { isBackendEnabled } from "@/server/env";

type DbExecutor = Pick<ReturnType<typeof getDb>, "insert">;

export async function appendActivityLogDb(
  input: {
    userId?: string | null;
    actionType: string;
    description: string;
    ipAddress?: string | null;
  },
  executor?: DbExecutor,
) {
  if (!isBackendEnabled()) return;
  try {
    const db = executor ?? getDb();
    await db.insert(activityLogs).values({
      userId: input.userId ?? null,
      actionType: input.actionType,
      description: input.description,
      ipAddress: input.ipAddress ?? null,
    });
  } catch {
    // Logging is best-effort
  }
}

export type ActivityLogEntry = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userDisplayName: string | null;
  userRole: string | null;
  actionType: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
};

export type FetchActivityLogsResult = {
  logs: ActivityLogEntry[];
  total: number;
};

export async function fetchActivityLogsDb(options?: {
  actionTypes?: string[];
  actionType?: string;
  role?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<FetchActivityLogsResult> {
  const db = getDb();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 30));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const actionTypes = options?.actionTypes?.filter(Boolean) ?? [];
  if (actionTypes.length > 0) {
    conditions.push(inArray(activityLogs.actionType, actionTypes));
  } else if (options?.actionType) {
    conditions.push(eq(activityLogs.actionType, options.actionType));
  }
  if (options?.userId) {
    conditions.push(eq(activityLogs.userId, options.userId));
  }
  if (options?.role) {
    conditions.push(sql`${profiles.role} = ${options.role}`);
  }
  if (options?.from) {
    conditions.push(sql`${activityLogs.createdAt} >= ${options.from}::timestamptz`);
  }
  if (options?.to) {
    conditions.push(sql`${activityLogs.createdAt} <= ${options.to}::timestamptz`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [total] = await db
    .select({ count: count() })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      userEmail: profiles.email,
      userDisplayName: profiles.displayName,
      userRole: profiles.role,
      actionType: activityLogs.actionType,
      description: activityLogs.description,
      ipAddress: activityLogs.ipAddress,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
    .where(whereClause)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    logs: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    total: total.count,
  };
}
