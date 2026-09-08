"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Printer,
  Search,
  Wallet,
} from "lucide-react";
import { useMagacin } from "@/hooks/useMagacin";
import { useMagacinRecipe } from "@/hooks/useMagacinRecipe";
import { StaffCard, StaffSegmentedControl, staffInputClass } from "@/components/staff";
import {
  ingredientCategoryLabels,
  ingredientTypeLabels,
  ingredientUnitLabels,
  type IngredientUnit,
  type ProcurementReport,
} from "@/lib/magacin-mock";
import { recipeMealTypeLabels } from "@/lib/magacin-recipe-mock";
import type { MealType } from "@/lib/meal-types";
import { SectionCard } from "./shared";

function fmt(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${Number(m)}.`;
}

function fmtRsd(n: number) {
  return `${n.toLocaleString("sr-RS")} RSD`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function printReport(report: ProcurementReport) {
  const rows = report.items
    .map(
      (item, i) =>
        `<tr>
    <td style="padding:6px 12px;border:1px solid #ddd;">${i + 1}</td>
    <td style="padding:6px 12px;border:1px solid #ddd;">${escapeHtml(item.name)}</td>
    <td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">${item.quantity.toLocaleString("sr-RS")} ${ingredientUnitLabels[item.unit]}</td>
    <td style="padding:6px 12px;border:1px solid #ddd;text-align:right;">${item.amountRsd.toLocaleString("sr-RS")} RSD</td>
  </tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(report.label)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th { padding: 6px 12px; border: 1px solid #bbb; background: #f3f4f6; text-align: left; font-weight: 600; }
  .total { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; font-size: 14px; font-weight: 700; }
</style>
</head>
<body>
  <h1>${escapeHtml(report.label)}</h1>
  <div class="meta">
    ${report.supplier ? `Dobavljač: ${escapeHtml(report.supplier)}<br>` : ""}
    Datum nabavke: ${report.dateKey}<br>
    Kreirao/la: ${escapeHtml(report.createdBy)}
  </div>
  <table>
    <thead><tr><th>#</th><th>Namirnica</th><th>Količina</th><th style="text-align:right;">Ukupno (RSD)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total"><span>Ukupno:</span><span>${report.totalRsd.toLocaleString("sr-RS")} RSD</span></div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function exportReportCsv(report: ProcurementReport) {
  const header = ["Namirnica", "Kolicina", "Jedinica", "Ukupno (RSD)"];
  const rows = report.items.map((item) => [
    item.name,
    String(item.quantity),
    ingredientUnitLabels[item.unit],
    String(item.amountRsd),
  ]);
  const csv = [header, ...rows, ["", "", "UKUPNO", String(report.totalRsd)]]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "izvestaj"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const mealTypeOptions: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Doručak" },
  { id: "lunch", label: "Ručak" },
  { id: "dinner", label: "Večera" },
];

const sectionIds = {
  low: "magacin-low",
  stock: "magacin-stock",
  recipes: "magacin-recipes",
  consumption: "magacin-consumption",
  reports: "magacin-reports",
};

export function MagacinTab() {
  const { state } = useMagacin();
  const {
    state: recipeState,
    plan,
    dateKey,
    setDateKey,
    mealType,
    setMealType,
  } = useMagacinRecipe();
  const [stockQuery, setStockQuery] = useState("");
  const [selectedDish, setSelectedDish] = useState<string>("");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const lowIngredients = useMemo(
    () =>
      state.ingredients
        .filter((i) => i.currentStock < i.minStock)
        .slice()
        .sort((a, b) => a.currentStock / a.minStock - b.currentStock / b.minStock),
    [state.ingredients],
  );

  const filteredStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return state.ingredients;
    return state.ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [state.ingredients, stockQuery]);

  const dishNames = useMemo(
    () => recipeState.recipes.map((r) => r.dishName).slice().sort((a, b) => a.localeCompare(b)),
    [recipeState.recipes],
  );

  const activeRecipe = useMemo(
    () =>
      recipeState.recipes.find((r) => r.dishName === selectedDish) ??
      recipeState.recipes[0] ??
      null,
    [recipeState.recipes, selectedDish],
  );

  const finalizedReports = useMemo(
    () =>
      state.reports
        .filter((r) => r.status === "finalized")
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reports],
  );

  const totalSpent = useMemo(
    () => finalizedReports.reduce((s, r) => s + r.totalRsd, 0),
    [finalizedReports],
  );

  const planApplied = plan?.appliedAt != null;
  const mainRows = useMemo(
    () => (plan?.ingredients ?? []).filter((i) => i.ingredientType === "main"),
    [plan],
  );
  const overheadRows = useMemo(
    () => (plan?.ingredients ?? []).filter((i) => i.ingredientType === "overhead"),
    [plan],
  );

  const reportDelta = useMemo(() => {
    const map = new Map<string, { quantity: number; unit: IngredientUnit; label: string }>();
    const finalized = [...state.reports]
      .filter((r) => r.status === "finalized")
      .sort((a, b) =>
        (b.finalizedAt ?? b.createdAt).localeCompare(a.finalizedAt ?? a.createdAt),
      );
    for (const report of finalized) {
      for (const item of report.items) {
        if (!item.ingredientId || map.has(item.ingredientId)) continue;
        map.set(item.ingredientId, {
          quantity: item.quantity,
          unit: item.unit,
          label: report.label,
        });
      }
    }
    return map;
  }, [state.reports]);

  const consumedNames = useMemo(() => {
    const set = new Set<string>();
    for (const row of plan?.ingredients ?? []) {
      if (row.ingredientType === "main" && row.neededThisMenu > 0) {
        set.add(row.ingredientName.toLowerCase());
      }
    }
    return set;
  }, [plan]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const kpis = [
    { id: "stock", count: state.ingredients.length, label: "Namirnica", icon: Boxes, tone: "bg-blue-100 text-blue-600" },
    { id: "low", count: lowIngredients.length, label: "Ispod granice", icon: AlertTriangle, tone: "bg-red-100 text-red-600", danger: true },
    { id: "recipes", count: recipeState.recipes.length, label: "Spiskova (recepti)", icon: BookOpen, tone: "bg-violet-100 text-violet-600" },
    { id: "reports", count: finalizedReports.length, label: "Izveštaji nabavke", icon: ClipboardList, tone: "bg-emerald-100 text-emerald-600" },
    { id: "reports", count: totalSpent, label: "Potrošeno na nabavke", icon: Wallet, tone: "bg-amber-100 text-amber-600", money: true },
  ];

  return (
    <div className="space-y-4">
      {/* Headline KPI cards (click -> scroll to section) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => scrollTo(sectionIds[kpi.id as keyof typeof sectionIds])}
            className="text-left"
          >
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${kpi.tone}`}>
                  <kpi.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {kpi.label}
                  </p>
                  <p
                    className={`text-xl font-bold tabular-nums ${
                      kpi.danger && kpi.count > 0 ? "text-red-600" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {kpi.money ? fmtRsd(kpi.count) : kpi.count.toLocaleString("sr-RS")}
                  </p>
                </div>
              </div>
            </StaffCard>
          </button>
        ))}
      </div>

      {/* Low stock */}
      <div id={sectionIds.low} style={{ scrollMarginTop: 90 }}>
        <SectionCard title={`Nisko stanje (${lowIngredients.length})`}>
          {lowIngredients.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 size={16} />
              Sve namirnice su iznad donje granice.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stanje</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Donja granica</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nedostaje do min.</th>
                  </tr>
                </thead>
                <tbody>
                  {lowIngredients.map((ing) => {
                    const missing = Math.max(0, ing.minStock - ing.currentStock);
                    return (
                      <tr key={ing.id} className="border-b border-[var(--card-border)] last:border-0 bg-red-50/50">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                            {ing.name}
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Nisko</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold tabular-nums text-red-600">
                          {ing.currentStock.toLocaleString("sr-RS")} {ingredientUnitLabels[ing.unit]}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-[var(--text-secondary)]">
                          {ing.minStock.toLocaleString("sr-RS")} {ingredientUnitLabels[ing.unit]}
                        </td>
                        <td className="px-4 py-2.5 font-semibold tabular-nums text-red-600">
                          {missing.toLocaleString("sr-RS")} {ingredientUnitLabels[ing.unit]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Full stock table */}
      <div id={sectionIds.stock} style={{ scrollMarginTop: 90 }}>
        <StaffCard
          title="Stanje magacina"
          description="Trenutne količine na stanju i donje granice za sve namirnice."
          padding="lg"
        >
          <div className="mb-3 flex items-center gap-2">
            <Search size={15} className="text-[var(--text-muted)]" />
            <input
              className={staffInputClass + " w-56"}
              placeholder="Pretraži namirnice..."
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Kategorija</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tip</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stanje</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Donja granica</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((ing) => {
                  const low = ing.currentStock < ing.minStock;
                  return (
                    <tr
                      key={ing.id}
                      className={`border-b border-[var(--card-border)] last:border-0 ${low ? "bg-red-50/60" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                          {ing.name}
                          {low ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              Nisko
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                        {ingredientCategoryLabels[ing.category]}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                        {ingredientTypeLabels[ing.ingredientType]}
                      </td>
                      <td className={`px-4 py-2.5 font-semibold tabular-nums ${low ? "text-red-600" : "text-[var(--text-primary)]"}`}>
                        {ing.currentStock.toLocaleString("sr-RS")} {ingredientUnitLabels[ing.unit]}
                        {reportDelta.has(ing.id) || consumedNames.has(ing.name.toLowerCase()) ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {reportDelta.has(ing.id) ? (
                              (() => {
                                const delta = reportDelta.get(ing.id)!;
                                return (
                                  <span
                                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700"
                                    title={`Knjiženo na zalihu – poslednja finalizovana nabavka: ${delta.label}`}
                                  >
                                    +{delta.quantity.toLocaleString("sr-RS")} {ingredientUnitLabels[delta.unit]}
                                  </span>
                                );
                              })()
                            ) : null}
                            {consumedNames.has(ing.name.toLowerCase()) ? (
                              <span
                                className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
                                title={`Planirana potrošnja po porudžbinama za ${dateKey}`}
                              >
                                −
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                        {ing.minStock.toLocaleString("sr-RS")} {ingredientUnitLabels[ing.unit]}
                      </td>
                    </tr>
                  );
                })}
                {filteredStock.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]" colSpan={5}>
                      Nema namirnica koje odgovaraju pretrazi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </StaffCard>
      </div>

      {/* Recipes / spisak */}
      <div id={sectionIds.recipes} style={{ scrollMarginTop: 90 }}>
        <SectionCard title={`Spisak (recepti) — ${recipeState.recipes.length}`}>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Izaberite jelo iz liste da vidite koliko koje namirnice ide u njegov spisak (recept).
          </p>
          {recipeState.recipes.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Još nema definisanih spiskova.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Dish list */}
              <div className="overflow-hidden rounded-lg border border-[var(--card-border)]">
                <div className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jela</p>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {dishNames.map((name) => {
                    const active = activeRecipe?.dishName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedDish(name)}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        <span className="truncate">{name}</span>
                        {active ? <span className="ml-2 text-xs">→</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected dish recipe */}
              <div className="md:col-span-2">
                {activeRecipe ? (
                  <div className="rounded-lg border border-[var(--card-border)] bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-base font-bold text-[var(--text-primary)]">{activeRecipe.dishName}</p>
                      <p className="text-xs text-[var(--text-muted)]">ažurirano {fmt(activeRecipe.updatedAt.slice(0, 10))}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] text-left">
                            <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica</th>
                            <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Količina / obrok</th>
                            <th className="py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Napomena</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRecipe.entries.map((entry) => {
                            const main = entry.perServing > 0;
                            const overhead = entry.used;
                            if (!main && !overhead) return null;
                            return (
                              <tr key={entry.id} className="border-b border-[var(--card-border)] last:border-0">
                                <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{entry.ingredientName}</td>
                                <td className="py-2 pr-4 tabular-nums text-[var(--text-primary)]">
                                  {main
                                    ? `${entry.perServing.toLocaleString("sr-RS")} ${ingredientUnitLabels[entry.unit]}`
                                    : overhead
                                      ? "—"
                                      : "—"}
                                </td>
                                <td className="py-2 text-xs text-[var(--text-secondary)]">
                                  {overhead
                                    ? "rezijska namirnica (koristi se)"
                                    : main
                                      ? "glavna sirovina"
                                      : ""}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Consumption by day */}
      <div id={sectionIds.consumption} style={{ scrollMarginTop: 90 }}>
        <StaffCard
          title="Potrošnja po danu"
          description="Planirana potrošnja prema broju porudžbina i normativima (Zaliha − Potrebno = Preostaje)."
          padding="lg"
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Datum:</span>
              <input
                className={staffInputClass + " w-36"}
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
              />
            </label>
            <StaffSegmentedControl
              options={mealTypeOptions}
              value={mealType}
              onChange={setMealType}
            />
            {plan && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  planApplied ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-[var(--text-secondary)]"
                }`}
              >
                {planApplied ? <CheckCircle2 size={13} /> : <ClipboardList size={13} />}
                {planApplied ? `Primenjeno (${fmt(plan.appliedAt ? plan.appliedAt.slice(0, 10) : "")})` : "Nije primenjeno"}
              </span>
            )}
          </div>

          {!plan ? (
            <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
          ) : mainRows.length === 0 && overheadRows.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Nema potrošnje za {fmt(plan.dateKey)} ({recipeMealTypeLabels[plan.mealType]}).
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">
                Ukupno porcija: <span className="font-semibold text-[var(--text-primary)]">{plan.totalServings}</span> ·{" "}
                {recipeMealTypeLabels[plan.mealType]}
              </p>
              {mainRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica (glavna)</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Zaliha</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Potrebno</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Preostaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainRows.map((row) => {
                        const negative = row.remainingAfterMenu < 0;
                        return (
                          <tr key={row.ingredientName} className="border-b border-[var(--card-border)] last:border-0">
                            <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                              {row.ingredientName}
                              {row.applied ? (
                                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  primenjeno
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-[var(--text-secondary)]">
                              {row.currentStock.toLocaleString("sr-RS")} {ingredientUnitLabels[row.unit]}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-[var(--text-primary)]">
                              {row.neededThisMenu.toLocaleString("sr-RS")} {ingredientUnitLabels[row.unit]}
                            </td>
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${negative ? "text-red-600" : "text-[var(--text-primary)]"}`}>
                              {row.remainingAfterMenu.toLocaleString("sr-RS")}
                              <span className="ml-1 font-normal text-[var(--text-muted)]">{ingredientUnitLabels[row.unit]}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {overheadRows.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-right text-sm font-semibold text-[var(--text-secondary)]">
                    Rezijske namirnice – ručno unesite koliko je potrošeno (u kuhinji)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Potrošeno (ručno)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overheadRows.map((row) => {
                          const missing = row.currentStock < row.minStock;
                          return (
                            <tr
                              key={row.ingredientName}
                              className={`border-b border-[var(--card-border)] last:border-0 ${missing ? "bg-red-50/50" : ""}`}
                            >
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-[var(--text-primary)]">{row.ingredientName}</span>
                                {missing ? (
                                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-red-700">
                                    <span className="tabular-nums">
                                      {row.currentStock.toLocaleString("sr-RS")} {ingredientUnitLabels[row.unit]}
                                    </span>
                                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold">
                                      Nisko stanje
                                    </span>
                                  </span>
                                ) : (
                                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                                    <span className="tabular-nums">
                                      {row.currentStock.toLocaleString("sr-RS")} {ingredientUnitLabels[row.unit]}
                                    </span>
                                    {row.applied ? " · primenjeno" : ""}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                                —
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </StaffCard>
      </div>

      {/* Procurement reports + money */}
      <div id={sectionIds.reports} style={{ scrollMarginTop: 90 }}>
        <SectionCard title={`Izveštaji nabavke — ${finalizedReports.length}`}>
          {finalizedReports.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Još nema finalizovanih izveštaja nabavke.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
                <Wallet size={15} className="text-amber-600" />
                <span className="font-medium text-amber-800">Ukupno potrošeno na nabavke:</span>
                <span className="font-bold tabular-nums text-amber-800">{fmtRsd(totalSpent)}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                <table className="w-full text-sm">
                  <thead>
                      <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)] text-left">
                        <th className="w-10 px-4 py-2.5"></th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Izveštaj</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Datum</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Stavki</th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ukupno (RSD)</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalizedReports.map((report) => {
                        const expanded = expandedReportId === report.id;
                        return (
                          <Fragment key={report.id}>
                            <tr className="border-b border-[var(--card-border)]">
                              <td className="px-4 py-2.5">
                                <button
                                  className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                  onClick={() => setExpandedReportId(expanded ? null : report.id)}
                                  title={expanded ? "Sakrij stavke" : "Prikaži stavke"}
                                  type="button"
                                >
                                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-[var(--text-primary)]">{report.label}</span>
                                <span className="ml-2 text-xs text-[var(--text-muted)]">{report.createdBy}</span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-secondary)]">{report.dateKey}</td>
                              <td className="px-4 py-2.5 text-[var(--text-secondary)]">{report.items.length}</td>
                              <td className="px-4 py-2.5 font-semibold tabular-nums text-[var(--text-primary)]">
                                {fmtRsd(report.totalRsd)}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                    onClick={() => printReport(report)}
                                    title="Štampaj izveštaj"
                                    type="button"
                                  >
                                    <Printer size={15} />
                                    Štampaj
                                  </button>
                                  <button
                                    className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                    onClick={() => exportReportCsv(report)}
                                    title="Izvezi izveštaj (CSV)"
                                    type="button"
                                  >
                                    <Download size={15} />
                                    Izvezi
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expanded ? (
                              <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)/40]">
                                <td className="px-4 py-3" colSpan={6}>
                                  <div className="rounded-lg border border-[var(--card-border)] bg-white">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-[var(--card-border)] text-left">
                                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Namirnica</th>
                                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Količina</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ukupno (RSD)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {report.items.length === 0 ? (
                                          <tr>
                                            <td className="px-4 py-4 text-center text-sm text-[var(--text-secondary)]" colSpan={3}>
                                              Izveštaj nema stavki.
                                            </td>
                                          </tr>
                                        ) : (
                                          report.items.map((item) => (
                                            <tr key={item.id} className="border-b border-[var(--card-border)] last:border-0">
                                              <td className="px-4 py-2">
                                                <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                                                {item.ingredientId ? (
                                                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                    knjiženo
                                                  </span>
                                                ) : null}
                                              </td>
                                              <td className="px-4 py-2 tabular-nums text-[var(--text-secondary)]">
                                                {item.quantity.toLocaleString("sr-RS")} {ingredientUnitLabels[item.unit]}
                                              </td>
                                              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-primary)]">
                                                {fmtRsd(item.amountRsd)}
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
