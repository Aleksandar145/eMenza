import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import { getStudentCardByProfileId } from "@/server/repositories/cards";
import {
  getStudentStatisticsDb,
  resolveStatisticsCardId,
  statisticsTransactionsToCsv,
  type StatisticsQuery,
} from "@/server/repositories/statistics";
import { getKitchenStatsDb } from "@/server/repositories/kitchen-stats";
import type { SpendingPeriod, TransactionType } from "@/lib/statistika-types";

const periodSchema = z.enum(["weekly", "monthly", "yearly"]);
const transactionTypeSchema = z.enum([
  "meal_charge",
  "refund",
  "top_up_cash",
  "top_up_bank",
]);

function parseDateParam(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function parseTypes(searchParams: URLSearchParams): TransactionType[] | undefined {
  const repeated = searchParams.getAll("type");
  const combined = repeated.length > 0 ? repeated : searchParams.get("types")?.split(",") ?? [];
  const normalized = combined
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry): entry is TransactionType =>
      transactionTypeSchema.safeParse(entry).success,
    );
  return normalized.length > 0 ? normalized : undefined;
}

function buildQuery(searchParams: URLSearchParams, profileId: string, cardId?: string): StatisticsQuery {
  const periodResult = periodSchema.safeParse(searchParams.get("period") ?? "weekly");
  const period = (periodResult.success ? periodResult.data : "weekly") as SpendingPeriod;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const periodOffset = Number(searchParams.get("periodOffset") ?? "0");
  const anchorDate = searchParams.get("anchorDate")?.trim() || undefined;

  return {
    profileId,
    cardId,
    period,
    anchorDate,
    periodOffset: Number.isFinite(periodOffset) ? periodOffset : 0,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : 10,
    types: parseTypes(searchParams),
    from: parseDateParam(searchParams.get("from")),
    to: parseDateParam(searchParams.get("to")),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  // --- LOGIKA ZA KUHINJU ---
  if (type === "kitchen") {
    const dateKey = searchParams.get("date") ?? new Date().toISOString().split('T')[0];
    const mealType = (searchParams.get("meal") ?? "lunch");
    const stats = await getKitchenStatsDb(dateKey, mealType);
    return jsonOk(stats);
  }

  // --- LOGIKA ZA STUDENTE ---
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const student = await getStudentRequestUser();
  if (!student) return jsonStudentError(null, "unauthorized", 401);

  const card = await getStudentCardByProfileId(student.id);
  let cardId = card?.id;

  if (!cardId) {
    cardId = await resolveStatisticsCardId(student.id);
  }

  const query = buildQuery(searchParams, student.id, cardId);

  try {
    const statistics = await getStudentStatisticsDb(query);
    const exportFormat = searchParams.get("export");

    if (exportFormat === "csv") {
      const csv = statisticsTransactionsToCsv(statistics.allTransactions);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="emenza-transakcije.csv"',
        },
      });
    }

    if (exportFormat === "pdf") {
      return jsonOk({
        export: "pdf",
        transactions: statistics.allTransactions,
        generatedAt: new Date().toISOString(),
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { allTransactions, ...payload } = statistics;
    return jsonOk(payload);
  } catch (error) {
    console.error("[statistics] GET failed", error);
    return jsonError(
      error instanceof Error ? error.message : "Učitavanje statistike nije uspelo.",
      500,
    );
  }
}