import { count, sql } from "drizzle-orm";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { dishes, mealReservations, transactions } from "@/server/db/schema";

function dateOnly(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateDiff(a: number, b: number) {
  const diff = a - b;
  const percent = b > 0 ? Math.round((diff / b) * 1000) / 10 : 0;
  return { diff, percent };
}

async function queryMealCounts(start: Date, end: Date) {
  const db = getDb();
  const rows = await db
    .select({ mealType: transactions.mealType, count: count() })
    .from(transactions)
    .where(
      sql`${transactions.createdAt} >= ${start.toISOString()} AND ${transactions.createdAt} <= ${end.toISOString()}`,
    )
    .groupBy(transactions.mealType);

  const breakfast = Number(rows.find((r) => r.mealType === "breakfast")?.count ?? 0);
  const lunch = Number(rows.find((r) => r.mealType === "lunch")?.count ?? 0);
  const dinner = Number(rows.find((r) => r.mealType === "dinner")?.count ?? 0);
  return { breakfast, lunch, dinner, total: breakfast + lunch + dinner };
}

async function queryDailyMealCounts(start: Date, end: Date) {
  const db = getDb();
  const rows = await db
    .select({
      date: sql<string>`CAST(${transactions.createdAt} AS DATE)`,
      mealType: transactions.mealType,
      count: count(),
    })
    .from(transactions)
    .where(
      sql`${transactions.createdAt} >= ${start.toISOString()} AND ${transactions.createdAt} <= ${end.toISOString()}`,
    )
    .groupBy(sql`CAST(${transactions.createdAt} AS DATE)`, transactions.mealType)
    .orderBy(sql`CAST(${transactions.createdAt} AS DATE)`);

  const map = new Map<string, { breakfast: number; lunch: number; dinner: number }>();

  for (const r of rows) {
    if (!map.has(r.date)) map.set(r.date, { breakfast: 0, lunch: 0, dinner: 0 });
    const day = map.get(r.date)!;
    day[r.mealType as "breakfast" | "lunch" | "dinner"] = Number(r.count);
  }

  const result: Array<{ date: string; breakfast: number; lunch: number; dinner: number; total: number }> = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const d = map.get(ds) ?? { breakfast: 0, lunch: 0, dinner: 0 };
    result.push({ date: ds, ...d, total: d.breakfast + d.lunch + d.dinner });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

async function queryDishSpending(start: Date, end: Date) {
  const db = getDb();

  const reservations = await db
    .select({
      mealType: mealReservations.mealType,
      glavnoJelo: mealReservations.glavnoJelo,
      dodatak: mealReservations.dodatak,
      salata: mealReservations.salata,
      obrok: mealReservations.obrok,
    })
    .from(mealReservations)
    .where(
      sql`${mealReservations.usedAt} >= ${start.toISOString()} AND ${mealReservations.usedAt} <= ${end.toISOString()}`,
    );

  const allDishes = await db.select().from(dishes);
  const dishByName = new Map(allDishes.map((d) => [d.name, d]));

  const perMeal: Record<string, Record<string, number>> = {};

  function addComponent(mt: string, dishName: string | null, category: string) {
    if (!dishName) return;
    const dish = dishByName.get(dishName);
    if (!dish) return;
    const price = Number(dish.priceRsd);
    if (!perMeal[mt]) perMeal[mt] = { main: 0, side: 0, salad: 0, dessert: 0, total: 0 };
    perMeal[mt][category] += price;
    perMeal[mt].total += price;
  }

  for (const r of reservations) {
    addComponent(r.mealType, r.glavnoJelo, "main");
    addComponent(r.mealType, r.dodatak, "side");
    addComponent(r.mealType, r.salata, "salad");
    addComponent(r.mealType, r.obrok, "dessert");
  }

  const combined = { main: 0, side: 0, salad: 0, dessert: 0, total: 0 };
  for (const mt of Object.values(perMeal)) {
    combined.main += mt.main;
    combined.side += mt.side;
    combined.salad += mt.salad;
    combined.dessert += mt.dessert;
    combined.total += mt.total;
  }

  return { ...perMeal, all: combined };
}

async function queryDailyDishSpending(start: Date, end: Date) {
  const db = getDb();

  const reservations = await db
    .select({
      date: sql<string>`CAST(${mealReservations.usedAt} AS DATE)`,
      mealType: mealReservations.mealType,
      glavnoJelo: mealReservations.glavnoJelo,
      dodatak: mealReservations.dodatak,
      salata: mealReservations.salata,
      obrok: mealReservations.obrok,
    })
    .from(mealReservations)
    .where(
      sql`${mealReservations.usedAt} >= ${start.toISOString()} AND ${mealReservations.usedAt} <= ${end.toISOString()}`,
    );

  const allDishes = await db.select().from(dishes);
  const dishByName = new Map(allDishes.map((d) => [d.name, d]));

  const perDay = new Map<string, { main: number; side: number; salad: number; dessert: number }>();

  function addComponent(ds: string, dishName: string | null, category: string) {
    if (!dishName) return;
    const dish = dishByName.get(dishName);
    if (!dish) return;
    const price = Number(dish.priceRsd);
    if (!perDay.has(ds)) perDay.set(ds, { main: 0, side: 0, salad: 0, dessert: 0 });
    const day = perDay.get(ds)!;
    day[category as "main" | "side" | "salad" | "dessert"] += price;
  }

  for (const r of reservations) {
    const ds = r.date;
    addComponent(ds, r.glavnoJelo, "main");
    addComponent(ds, r.dodatak, "side");
    addComponent(ds, r.salata, "salad");
    addComponent(ds, r.obrok, "dessert");
  }

  const result: Array<{ date: string; main: number; side: number; salad: number; dessert: number; total: number }> = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const d = perDay.get(ds) ?? { main: 0, side: 0, salad: 0, dessert: 0 };
    result.push({ date: ds, ...d, total: d.main + d.side + d.salad + d.dessert });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

type ReservationDailyPoint = {
  date: string;
  total: number;
  pickedUp: number;
  missed: number;
  cancelled: number;
  other: number;
};

async function queryReservationTrend(start: Date, end: Date): Promise<ReservationDailyPoint[]> {
  const db = getDb();

  const rows = await db
    .select({
      dateKey: mealReservations.dateKey,
      status: mealReservations.status,
      count: count(),
    })
    .from(mealReservations)
    .where(
      sql`${mealReservations.dateKey} >= ${start.toISOString().slice(0, 10)} AND ${mealReservations.dateKey} <= ${end.toISOString().slice(0, 10)}`,
    )
    .groupBy(mealReservations.dateKey, mealReservations.status)
    .orderBy(mealReservations.dateKey);

  const map = new Map<string, { pickedUp: number; missed: number; cancelled: number; other: number }>();

  for (const r of rows) {
    if (!map.has(r.dateKey)) map.set(r.dateKey, { pickedUp: 0, missed: 0, cancelled: 0, other: 0 });
    const day = map.get(r.dateKey)!;
    const c = Number(r.count);
    if (r.status === "iskorisceno") day.pickedUp += c;
    else if (r.status === "propusteno") day.missed += c;
    else day.other += c;
  }

  const result: ReservationDailyPoint[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10);
    const d = map.get(ds) ?? { pickedUp: 0, missed: 0, cancelled: 0, other: 0 };
    result.push({ date: ds, ...d, total: d.pickedUp + d.missed + d.cancelled + d.other });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function aggregateReservations(trend: ReservationDailyPoint[]) {
  const sum = { total: 0, pickedUp: 0, missed: 0, cancelled: 0, other: 0 };
  for (const d of trend) {
    sum.total += d.total;
    sum.pickedUp += d.pickedUp;
    sum.missed += d.missed;
    sum.cancelled += d.cancelled;
    sum.other += d.other;
  }
  return { ...sum, utilization: sum.total > 0 ? Math.round((sum.pickedUp / sum.total) * 100) : 0 };
}

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from")?.trim();
  const toParam = searchParams.get("to")?.trim();
  const from2Param = searchParams.get("from2")?.trim() || null;
  const to2Param = searchParams.get("to2")?.trim() || null;

  if (!fromParam || !toParam) {
    return jsonError("Parametri 'from' i 'to' su obavezni (YYYY-MM-DD).", 400);
  }

  const from = dateOnly(new Date(fromParam + "T00:00:00"));
  const to = dateOnly(new Date(toParam + "T00:00:00"));

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return jsonError("Nevalidan format datuma. Koristi YYYY-MM-DD.", 400);
  }

  if ((from2Param && !to2Param) || (!from2Param && to2Param)) {
    return jsonError("Parametri 'from2' i 'to2' moraju biti navedeni zajedno.", 400);
  }

  try {
    const period1 = await queryMealCounts(from, to);

    let period2 = null;
    let difference = null;

    if (from2Param && to2Param) {
      const from2 = dateOnly(new Date(from2Param + "T00:00:00"));
      const to2 = dateOnly(new Date(to2Param + "T00:00:00"));

      if (isNaN(from2.getTime()) || isNaN(to2.getTime())) {
        return jsonError("Nevalidan format datuma za period 2.", 400);
      }

      period2 = await queryMealCounts(from2, to2);
      difference = {
        breakfast: calculateDiff(period1.breakfast, period2.breakfast),
        lunch: calculateDiff(period1.lunch, period2.lunch),
        dinner: calculateDiff(period1.dinner, period2.dinner),
        total: calculateDiff(period1.total, period2.total),
      };
    }

    const dishSpending = await queryDishSpending(from, to);
    const dailyTrend = await queryDailyMealCounts(from, to);
    const dailyDishTrend = await queryDailyDishSpending(from, to);

    const reservationTrend = await queryReservationTrend(from, to);
    const reservationSummary = aggregateReservations(reservationTrend);

    let reservationPeriod2 = null;
    let reservationDifference = null;

    if (from2Param && to2Param) {
      const from2 = dateOnly(new Date(from2Param + "T00:00:00"));
      const to2 = dateOnly(new Date(to2Param + "T00:00:00"));

      if (!isNaN(from2.getTime()) && !isNaN(to2.getTime())) {
        const trend2 = await queryReservationTrend(from2, to2);
        reservationPeriod2 = aggregateReservations(trend2);
        reservationDifference = {
          total: calculateDiff(reservationSummary.total, reservationPeriod2.total),
          pickedUp: calculateDiff(reservationSummary.pickedUp, reservationPeriod2.pickedUp),
          missed: calculateDiff(reservationSummary.missed, reservationPeriod2.missed),
        };
      }
    }

    return jsonOk({
      period1,
      period2,
      difference,
      dishSpending,
      dailyTrend,
      dailyDishTrend,
      reservationTrend,
      reservationSummary,
      reservationPeriod2,
      reservationDifference,
    });
  } catch (error) {
    console.error("[admin/monitoring GET]", error);
    return jsonError("Greška pri učitavanju monitoring podataka.", 500);
  }
}
