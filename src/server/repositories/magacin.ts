import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  magacinIngredients,
  procurementReportItems,
  procurementReports,
} from "@/server/db/schema";
import type {
  Ingredient,
  MagacinState,
  ProcurementReport,
  ProcurementReportItem,
} from "@/lib/magacin-mock";

function num(v: string | null): number {
  return v ? Number(v) : 0;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function mapIngredient(row: typeof magacinIngredients.$inferSelect): Ingredient {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Ingredient["category"],
    unit: row.unit as Ingredient["unit"],
    ingredientType: (row.ingredientType ?? "main") as Ingredient["ingredientType"],
    currentStock: num(row.currentStock),
    minStock: num(row.minStock),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapReportItem(row: typeof procurementReportItems.$inferSelect): ProcurementReportItem {
  return {
    id: row.id,
    ingredientId: row.ingredientId ?? undefined,
    name: row.name,
    quantity: num(row.quantity),
    unit: row.unit as ProcurementReportItem["unit"],
    amountRsd: num(row.amountRsd),
  };
}

export async function fetchMagacinState(): Promise<MagacinState> {
  const db = getDb();

  const ingredientRows = await db
    .select()
    .from(magacinIngredients)
    .orderBy(asc(magacinIngredients.name));

  const reportRows = await db
    .select()
    .from(procurementReports)
    .orderBy(desc(procurementReports.createdAt));

  const items: ProcurementReportItem[][] = await Promise.all(
    reportRows.map((report) =>
      db
        .select()
        .from(procurementReportItems)
        .where(eq(procurementReportItems.reportId, report.id))
        .then((rows) => rows.map(mapReportItem)),
    ),
  );

  const reports: ProcurementReport[] = reportRows.map((report, i) => ({
    id: report.id,
    dateKey: report.dateKey,
    label: report.label,
    supplier: report.supplier ?? undefined,
    status: report.status === "finalized" ? "finalized" : "draft",
    totalRsd: num(report.totalRsd),
    createdBy: report.createdBy,
    createdAt: report.createdAt.toISOString(),
    finalizedAt: report.finalizedAt?.toISOString(),
    items: items[i] ?? [],
  }));

  return {
    ingredients: ingredientRows.map(mapIngredient),
    reports,
  };
}

export async function upsertIngredientDb(
  input: {
    id?: string;
    name: string;
    category: string;
    unit: string;
    ingredientType: string;
    currentStock: number;
    minStock: number;
  },
) {
  const db = getDb();
  const now = new Date();

  if (input.id) {
    await db
      .update(magacinIngredients)
      .set({
        name: input.name,
        category: input.category,
        unit: input.unit,
        ingredientType: input.ingredientType,
        currentStock: String(input.currentStock),
        minStock: String(input.minStock),
        updatedAt: now,
      })
      .where(eq(magacinIngredients.id, input.id));
  } else {
    await db.insert(magacinIngredients).values({
      name: input.name,
      category: input.category,
      unit: input.unit,
      ingredientType: input.ingredientType,
      currentStock: String(input.currentStock),
      minStock: String(input.minStock),
    });
  }

  return fetchMagacinState();
}

export async function deleteIngredientDb(id: string) {
  const db = getDb();
  await db.delete(magacinIngredients).where(eq(magacinIngredients.id, id));
  return fetchMagacinState();
}

export async function upsertReportDb(
  input: {
    id?: string;
    dateKey: string;
    label: string;
    supplier?: string;
    status: string;
    totalRsd: number;
    createdBy: string;
    finalizedAt?: string;
    items: Array<Omit<ProcurementReportItem, "id">>;
  },
) {
  const db = getDb();

  let reportId = isUuid(input.id)
    ? String(input.id).trim().toLowerCase()
    : undefined;

  if (reportId) {
    const [existing] = await db
      .select({ id: procurementReports.id })
      .from(procurementReports)
      .where(eq(procurementReports.id, reportId))
      .limit(1);

    if (existing) {
      await db
        .update(procurementReports)
        .set({
          dateKey: input.dateKey,
          label: input.label,
          supplier: input.supplier ?? null,
          status: input.status,
          totalRsd: String(input.totalRsd),
          finalizedAt: input.finalizedAt ? new Date(input.finalizedAt) : null,
        })
        .where(eq(procurementReports.id, reportId));
    } else {
      const [created] = await db
        .insert(procurementReports)
        .values({
          id: reportId,
          dateKey: input.dateKey,
          label: input.label,
          supplier: input.supplier ?? null,
          status: input.status,
          totalRsd: String(input.totalRsd),
          createdBy: input.createdBy,
          finalizedAt: input.finalizedAt ? new Date(input.finalizedAt) : null,
        })
        .returning({ id: procurementReports.id });
      reportId = created.id;
    }
  } else {
    const [created] = await db
      .insert(procurementReports)
      .values({
        dateKey: input.dateKey,
        label: input.label,
        supplier: input.supplier ?? null,
        status: input.status,
        totalRsd: String(input.totalRsd),
        createdBy: input.createdBy,
        finalizedAt: input.finalizedAt ? new Date(input.finalizedAt) : null,
      })
      .returning({ id: procurementReports.id });
    reportId = created.id;
  }

  await db
    .delete(procurementReportItems)
    .where(eq(procurementReportItems.reportId, reportId));

  for (const item of input.items) {
    await db.insert(procurementReportItems).values({
      reportId,
      ingredientId: item.ingredientId ?? null,
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      amountRsd: String(item.amountRsd),
    });
  }

  return fetchMagacinState();
}

export async function deleteReportDb(id: string) {
  const db = getDb();
  await db.delete(procurementReports).where(eq(procurementReports.id, id));
  return fetchMagacinState();
}
