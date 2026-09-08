import { sql } from "drizzle-orm";
import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type UsersMonitoringRow = {
  totalStudents: number;
  totalHighSchoolers: number;
  totalOther: number;
  totalUsers: number;
  newReservations: number;
  activeUsers: number;
  newUsersInPeriod: number;
  newStudentsInPeriod: number;
  newHighSchoolersInPeriod: number;
  reservationsByFaculty: { faculty: string; count: number }[];
  dailyReservations: { date: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
  fastingWedFri: number;
  fastingGreatLent: number | null;
  religionIslam: number;
  religionChristianity: number;
  religionNone: number;
  isAllTime: boolean;
};

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin", "referent", "kitchen"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("Invalid parameters", 400);
  }
  const { from, to } = parsed.data;
  const isAllTime = !from || !to;

  const dateFilterWhere = isAllTime ? sql`WHERE 1=1` : sql`WHERE mr.date_key >= ${from} AND mr.date_key <= ${to}`;
  const dateFilterFull = isAllTime ? sql`WHERE 1=1` : sql`WHERE date_key >= ${from} AND date_key <= ${to}`;

  const db = getDb();

  // Count users by type
  const userCounts = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN role = 'student' AND (user_type IS NULL OR user_type = 'student') THEN 1 ELSE 0 END)::int, 0) AS total_students,
      COALESCE(SUM(CASE WHEN role = 'student' AND user_type = 'ucenik' THEN 1 ELSE 0 END)::int, 0) AS total_high_schoolers,
      COALESCE(SUM(CASE WHEN role != 'student' THEN 1 ELSE 0 END)::int, 0) AS total_other,
      COUNT(*)::int AS total_users
    FROM profiles
  `);

  // Reservations in period
  const resCounts = await db.execute(sql`
    SELECT
      COUNT(*)::int AS new_reservations,
      COUNT(DISTINCT profile_id)::int AS active_users
    FROM meal_reservations
    ${dateFilterFull}
  `);

  // Reservations by faculty
  const byFaculty = await db.execute(sql`
    SELECT
      COALESCE(p.faculty, 'Nepoznato') AS faculty,
      COUNT(*)::int AS count
    FROM meal_reservations mr
    LEFT JOIN profiles p ON p.id = mr.profile_id
    ${dateFilterWhere}
    GROUP BY p.faculty
    ORDER BY count DESC
  `);

  // Daily reservations
  const dailyRes = await db.execute(sql`
    SELECT
      mr.date_key AS date,
      COUNT(*)::int AS count
    FROM meal_reservations mr
    ${dateFilterWhere}
    GROUP BY mr.date_key
    ORDER BY mr.date_key
  `);

  // Religion and fasting declarations
  const religionCounts = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN us.settings #>> '{profile,religion}' = 'islam' THEN 1 ELSE 0 END)::int, 0) AS religion_islam,
      COALESCE(SUM(CASE WHEN us.settings #>> '{profile,religion}' = 'hristijanstvo' THEN 1 ELSE 0 END)::int, 0) AS religion_christianity,
      COALESCE(SUM(CASE WHEN us.settings #>> '{profile,religion}' IS NULL OR us.settings #>> '{profile,religion}' = '' THEN 1 ELSE 0 END)::int, 0) AS religion_none
    FROM user_settings us
  `);

  const fastingCounts = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN us.settings #>> '{fasting,sredaPetak}' = 'postim' THEN 1 ELSE 0 END)::int, 0) AS fasting_wed_fri,
      COALESCE(SUM(CASE WHEN us.settings #>> '{fasting,velikiPost2026}' IS NOT NULL AND us.settings #>> '{fasting,velikiPost2026}' != '' THEN 1 ELSE 0 END)::int, 0) AS fasting_great_lent
    FROM user_settings us
  `);

  // Daily active users
  const dailyActive = await db.execute(sql`
    SELECT
      mr.date_key AS date,
      COUNT(DISTINCT mr.profile_id)::int AS count
    FROM meal_reservations mr
    ${dateFilterWhere}
    GROUP BY mr.date_key
    ORDER BY mr.date_key
  `);

  const uc = ([...userCounts] as { total_students: number; total_high_schoolers: number; total_other: number; total_users: number }[])[0] || { total_students: 0, total_high_schoolers: 0, total_other: 0, total_users: 0 };
  const rc = ([...resCounts] as { new_reservations: number; active_users: number }[])[0] || { new_reservations: 0, active_users: 0 };
  const relc = ([...religionCounts] as { religion_islam: number; religion_christianity: number; religion_none: number }[])[0] || { religion_islam: 0, religion_christianity: 0, religion_none: 0 };
  const fc = ([...fastingCounts] as { fasting_wed_fri: number; fasting_great_lent: number }[])[0] || { fasting_wed_fri: 0, fasting_great_lent: 0 };

  // New users created in period
  let newUsersInPeriod = 0;
  let newStudentsInPeriod = 0;
  let newHighSchoolersInPeriod = 0;
  if (!isAllTime && from && to) {
    const newUserCounts = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN role = 'student' AND (user_type IS NULL OR user_type = 'student') THEN 1 ELSE 0 END)::int, 0) AS new_students,
        COALESCE(SUM(CASE WHEN role = 'student' AND user_type = 'ucenik' THEN 1 ELSE 0 END)::int, 0) AS new_high_schoolers,
        COUNT(*)::int AS new_total
      FROM profiles
      WHERE created_at >= ${from}::timestamp AND created_at <= (${to}::date + interval '1 day')
    `);
    const nuc = ([...newUserCounts] as { new_students: number; new_high_schoolers: number; new_total: number }[])[0] || { new_students: 0, new_high_schoolers: 0, new_total: 0 };
    newUsersInPeriod = nuc.new_total;
    newStudentsInPeriod = nuc.new_students;
    newHighSchoolersInPeriod = nuc.new_high_schoolers;
  }

  // Check if Great Lent (Veliki post) is currently active - typically Feb-Mar
  const now = new Date();
  const year = now.getFullYear();
  const greatLentStart = new Date(year, 1, 1); // approximate
  const greatLentEnd = new Date(year, 3, 15); // approximate
  const isGreatLentActive = now >= greatLentStart && now <= greatLentEnd;

  return jsonOk({
    totalStudents: uc.total_students,
    totalHighSchoolers: uc.total_high_schoolers,
    totalOther: uc.total_other,
    totalUsers: uc.total_users,
    newReservations: rc.new_reservations,
    activeUsers: rc.active_users,
    newUsersInPeriod,
    newStudentsInPeriod,
    newHighSchoolersInPeriod,
    reservationsByFaculty: [...byFaculty] as { faculty: string; count: number }[],
    dailyReservations: [...dailyRes] as { date: string; count: number }[],
    dailyActiveUsers: [...dailyActive] as { date: string; count: number }[],
    fastingWedFri: fc.fasting_wed_fri,
    fastingGreatLent: isGreatLentActive ? fc.fasting_great_lent : null,
    religionIslam: relc.religion_islam,
    religionChristianity: relc.religion_christianity,
    religionNone: relc.religion_none,
    isAllTime,
  });
}
