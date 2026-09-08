import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { procurementReports, transactions, staff } from "@/server/db/schema";


type Period = "week" | "month" | "year";

function getPeriodRange(period: Period, anchorDate?: string): { from: Date; to: Date } {
  const ref = anchorDate ? new Date(anchorDate + "T00:00:00") : new Date();
  const to = ref;

  if (period === "week") {
    const dayOfWeek = (ref.getDay() + 6) % 7;
    const from = new Date(ref);
    from.setDate(ref.getDate() - dayOfWeek);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  if (period === "month") {
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    return { from, to };
  }

  const from = new Date(ref.getFullYear(), 0, 1);
  return { from, to };
}

function getPreviousPeriodRange(
  period: Period,
  currentFrom: Date,
): { from: Date; to: Date } {
  const to = new Date(currentFrom);

  if (period === "week") {
    const from = new Date(currentFrom);
    from.setDate(from.getDate() - 7);
    return { from, to };
  }

  if (period === "month") {
    const from = new Date(currentFrom.getFullYear(), currentFrom.getMonth() - 1, 1);
    return { from, to };
  }

  const from = new Date(currentFrom.getFullYear() - 1, 0, 1);
  return { from, to };
}

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") as Period) ?? "month";
  const anchorDate = searchParams.get("anchorDate")?.trim() || undefined;

  if (!["week", "month", "year"].includes(period)) {
    return jsonError("Nevalidan period. Koristi: week, month, year", 400);
  }

  const { from, to } = getPeriodRange(period, anchorDate);

  try {
    const db = getDb();

    const mealTypeRows = await db
      .select({
        mealType: transactions.mealType,
        count: count(),
        totalRsd: sql<string>`CAST(SUM(${transactions.amount}) AS TEXT)`,
      })
      .from(transactions)
      .where(
        sql`${transactions.createdAt} >= ${from.toISOString()} AND ${transactions.createdAt} <= ${to.toISOString()}`,
      )
      .groupBy(transactions.mealType)
      .orderBy(transactions.mealType);

    const staffRows = await db
      .select({
        staffId: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        transactionCount: count(),
        totalRsd: sql<string>`COALESCE(CAST(SUM(${transactions.amount}) AS TEXT), '0')`,
      })
      .from(staff)
      .leftJoin(
        transactions,
        sql`${eq(transactions.staffId, staff.id)} AND ${transactions.createdAt} >= ${from.toISOString()} AND ${transactions.createdAt} <= ${to.toISOString()}`,
      )
      .groupBy(staff.id, staff.fullName, staff.email)
      .orderBy(staff.fullName);

    const [cashRow] = await db
      .select({
        totalRsd: sql<string>`CAST(SUM(${transactions.amount}) AS TEXT)`,
      })
      .from(transactions)
      .where(
        sql`${transactions.paymentMethod} = 'cash' AND ${transactions.createdAt} >= ${from.toISOString()} AND ${transactions.createdAt} <= ${to.toISOString()}`,
      );

    const cashTotalRsd = cashRow?.totalRsd ? Number(cashRow.totalRsd) : 0;
    const cardMockRsd = 150_000;
    const currentTotalRsd = cashTotalRsd + cardMockRsd;

    const { from: prevFrom, to: prevTo } = getPreviousPeriodRange(period, from);

    const [prevCashRow] = await db
      .select({
        totalRsd: sql<string>`CAST(SUM(${transactions.amount}) AS TEXT)`,
      })
      .from(transactions)
      .where(
        sql`${transactions.paymentMethod} = 'cash' AND ${transactions.createdAt} >= ${prevFrom.toISOString()} AND ${transactions.createdAt} <= ${prevTo.toISOString()}`,
      );

    const prevCashTotalRsd = prevCashRow?.totalRsd ? Number(prevCashRow.totalRsd) : 0;
    const prevTotalRsd = prevCashTotalRsd + cardMockRsd;

    async function sumExpenses(periodFrom: Date, periodTo: Date): Promise<number> {
      const fromKey = periodFrom.toISOString().slice(0, 10);
      const toKey = periodTo.toISOString().slice(0, 10);
      const rows = await db
        .select({
          totalRsd: procurementReports.totalRsd,
        })
        .from(procurementReports)
        .where(
          and(
            eq(procurementReports.status, "finalized"),
            gte(procurementReports.dateKey, fromKey),
            lte(procurementReports.dateKey, toKey),
          ),
        );
      return rows.reduce((sum, r) => sum + (Number(r.totalRsd) || 0), 0);
    }

    const currentExpensesRsd = await sumExpenses(from, to);
    const prevExpensesRsd = await sumExpenses(prevFrom, prevTo);

    const currentNetRsd = currentTotalRsd - currentExpensesRsd;
    const prevNetRsd = prevTotalRsd - prevExpensesRsd;

    function pctChange(current: number, prev: number): number {
      if (prev === 0) return 0;
      return ((current - prev) / prev) * 100;
    }

    let totalPercentChange = 0;
    if (prevTotalRsd > 0) {
      totalPercentChange = pctChange(currentTotalRsd, prevTotalRsd);
    }

    let cashPercentChange = 0;
    if (prevCashTotalRsd > 0) {
      cashPercentChange = pctChange(cashTotalRsd, prevCashTotalRsd);
    }

    function direction(v: number): "up" | "down" | "flat" {
      return v > 0 ? "up" : v < 0 ? "down" : "flat";
    }

    return jsonOk({
      mealTypeBreakdown: mealTypeRows.map((r) => ({
        mealType: r.mealType,
        count: Number(r.count),
        totalRsd: Number(r.totalRsd),
      })),
      staffPerformance: staffRows.map((r) => ({
        staffId: r.staffId,
        fullName: r.fullName,
        email: r.email,
        transactionCount: Number(r.transactionCount),
        totalRsd: Number(r.totalRsd),
      })),
      paymentMethods: {
        cashTotalRsd,
        cardTotalRsd: cardMockRsd,
      },
      profit: {
        totalIncomeRsd: currentTotalRsd,
        expensesRsd: currentExpensesRsd,
        netProfitRsd: currentNetRsd,
        previousTotalIncomeRsd: prevTotalRsd,
        previousExpensesRsd: prevExpensesRsd,
        previousNetProfitRsd: prevNetRsd,
        incomeChange: {
          percentChange: Math.round(pctChange(currentTotalRsd, prevTotalRsd) * 10) / 10,
          direction: direction(pctChange(currentTotalRsd, prevTotalRsd)),
        },
        expensesChange: {
          percentChange: Math.round(pctChange(currentExpensesRsd, prevExpensesRsd) * 10) / 10,
          direction: direction(pctChange(currentExpensesRsd, prevExpensesRsd)),
        },
        netProfitChange: {
          percentChange: Math.round(pctChange(currentNetRsd, prevNetRsd) * 10) / 10,
          direction: direction(pctChange(currentNetRsd, prevNetRsd)),
        },
      },
      comparison: {
        total: {
          percentChange: Math.round(totalPercentChange * 10) / 10,
          previousTotalRsd: prevTotalRsd,
          direction: direction(totalPercentChange),
        },
        cash: {
          percentChange: Math.round(cashPercentChange * 10) / 10,
          previousTotalRsd: prevCashTotalRsd,
          direction: direction(cashPercentChange),
        },
        card: {
          percentChange: 0,
          previousTotalRsd: cardMockRsd,
          direction: "flat" as const,
        },
      },
    });
  } catch (error) {
    console.error("[admin/finances GET]", error);
    return jsonError("Greška pri učitavanju finansijskih podataka.", 500);
  }
}
