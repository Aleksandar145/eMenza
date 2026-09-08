"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  Package,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMagacin } from "@/hooks/useMagacin";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import { useToast } from "@/components/shared/toast/useToast";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffEmptyState,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
  staffLabelClass,
  StaffSegmentedControl,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
} from "@/components/staff";
import { toDateKey } from "@/lib/calendar-utils";
import {
  ingredientCategoryLabels,
  ingredientTypeLabels,
  ingredientUnitLabels,
  type Ingredient,
  type IngredientCategory,
  type IngredientType,
  type IngredientUnit,
  type MagacinState,
  type ProcurementReport,
} from "@/lib/magacin-mock";
import {
  addReportItem,
  createIngredient,
  createReport,
  deleteIngredient,
  deleteReport,
  finalizeReport,
  removeReportItem,
  updateIngredient,
} from "@/lib/magacin-store";
import { useMagacinRecipe } from "@/hooks/useMagacinRecipe";
import { RecipesTab } from "@/components/kuhinja/magacin/RecipesTab";
import { ConsumptionTab } from "@/components/kuhinja/magacin/ConsumptionTab";

type ActiveTab = "stock" | "create" | "archive" | "recipes" | "consumption";

const todayKey = toDateKey({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
});

const emptyIngredientForm = {
  name: "",
  category: "povrce" as IngredientCategory,
  unit: "kg" as IngredientUnit,
  ingredientType: "main" as IngredientType,
  currentStock: "",
  minStock: "",
};

function StockTab({
  state,
  onAdd,
  onEdit,
  reportDelta,
  consumedNames,
  consumptionDateKey,
  readOnly,
}: {
  state: MagacinState;
  onAdd: () => void;
  onEdit: (ingredient: Ingredient) => void;
  reportDelta: Map<string, { quantity: number; unit: IngredientUnit; label: string }>;
  consumedNames: Set<string>;
  consumptionDateKey: string;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [lowOnly, setLowOnly] = useState(false);

  const lowCount = useMemo(
    () => state.ingredients.filter((i) => i.currentStock < i.minStock).length,
    [state.ingredients],
  );
  const shown = lowOnly ? state.ingredients.filter((i) => i.currentStock < i.minStock) : state.ingredients;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Centralni pregled magacina. Zalihe se ažuriraju kroz nabavke i potrošnju; crveno su istaknute namirnice ispod donje granice.
        </p>
        {!readOnly ? (
          <button className={staffButtonPrimaryClass} onClick={onAdd} type="button">
            <Plus size={16} />
            Nova namirnica
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            lowOnly
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
          }`}
          onClick={() => setLowOnly((v) => !v)}
          type="button"
        >
          <span className="relative flex size-2">
            <span
              className={`absolute inline-flex size-full rounded-full ${lowOnly ? "bg-red-500" : "bg-[var(--text-muted)]"}`}
            />
          </span>
          Nisko stanje
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
              lowOnly ? "bg-red-200 text-red-800" : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
            }`}
          >
            {lowCount}
          </span>
        </button>
      </div>

      <StaffTable
        empty={shown.length === 0}
        emptyTitle={lowOnly ? "Nema namirnica ispod granice" : "Nema namirnica"}
        emptyDescription={
          lowOnly
            ? "Sve namirnice su iznad svoje donje granice."
            : "Dodajte prvu namirnicu u magacin."
        }
      >
        <StaffTableHead>
          <tr>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Kategorija</th>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Trenutno stanje</th>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Jedinica</th>
            {!readOnly ? (
              <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Akcije</th>
            ) : null}
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {shown.map((ingredient) => {
            const low = ingredient.currentStock < ingredient.minStock;
            return (
              <tr
                className={`border-t border-[var(--card-border)] ${low ? "bg-red-50/60" : ""}`}
                key={ingredient.id}
              >
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                    {ingredient.name}
                    {low ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        Nisko stanje
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[var(--text-secondary)]">
                  {ingredientCategoryLabels[ingredient.category]}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`font-semibold tabular-nums ${
                      low ? "text-red-700" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {ingredient.currentStock.toLocaleString("sr-RS")}
                  </span>{" "}
                  <span className="text-sm text-[var(--text-muted)]">
                    {ingredientUnitLabels[ingredient.unit]}
                  </span>
                  {reportDelta.has(ingredient.id) ||
                  consumedNames.has(ingredient.name.toLowerCase()) ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {reportDelta.has(ingredient.id) ? (
                        (() => {
                          const delta = reportDelta.get(ingredient.id)!;
                          return (
                            <span
                              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700"
                              title={`Knjiženo na zalihu – poslednja finalizovana nabavka: ${delta.label}`}
                            >
                              +{delta.quantity.toLocaleString("sr-RS")} {ingredientUnitLabels[delta.unit]}
                            </span>
                          );
                        })()
                      ) : null}
                      {consumedNames.has(ingredient.name.toLowerCase()) ? (
                        <span
                          className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                          title={`Planirana potrošnja po porudžbinama za ${consumptionDateKey}`}
                        >
                          −
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </td>
                <td className="py-3 pr-4 text-sm text-[var(--text-muted)]">
                  {ingredientUnitLabels[ingredient.unit]}
                </td>
                {!readOnly ? (
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className={staffButtonSecondaryClass}
                        onClick={() => onEdit(ingredient)}
                        type="button"
                      >
                        Izmeni
                      </button>
                      <button
                        aria-label={`Obriši ${ingredient.name}`}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteTarget(ingredient)}
                        title="Obriši"
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </StaffTableBody>
      </StaffTable>

      <StaffConfirmDialog
        cancelLabel="Otkaži"
        confirmLabel="Obriši"
        message={`Da li ste sigurni da želite da obrišete namirnicu "${deleteTarget?.name}"? Ova akcija se ne može poništiti.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteIngredient(deleteTarget!.id);
          setDeleteTarget(null);
          toast.success(`Namirnica "${deleteTarget!.name}" je obrisana.`);
        }}
        open={Boolean(deleteTarget)}
        title="Brisanje namirnice"
        variant="danger"
      />
    </div>
  );
}

const emptyItemForm = {
  ingredientId: "",
  name: "",
  quantity: "",
  unit: "kg" as IngredientUnit,
  amountRsd: "",
};

function CreateReportTab({ state }: { state: MagacinState }) {
  const toast = useToast();
  const { session } = useKuhinjaSessionContext();
  const [dateKey, setDateKey] = useState(todayKey);
  const [supplier, setSupplier] = useState("");
  const [report, setReport] = useState<ProcurementReport | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const ingredientOptions = state.ingredients;

  function startReport() {
    const created = createReport({
      dateKey,
      label: `Nabavka ${dateKey}`,
      supplier,
      createdBy: session?.displayName ?? "Zaposleni",
    });
    setReport(created);
    setItemForm(emptyItemForm);
  }

  function addItem() {
    if (!report) return;
    if (!itemForm.name.trim()) {
      toast.error("Unesite naziv namirnice.");
      return;
    }
    if (!itemForm.quantity || !itemForm.amountRsd) {
      toast.error("Popunite količinu i cenu.");
      return;
    }
    const qty = Number(itemForm.quantity);
    const amount = Number(itemForm.amountRsd);
    if (qty <= 0 || amount < 0) {
      toast.error("Količina i cena moraju biti pozitivni brojevi.");
      return;
    }
    addReportItem(report.id, {
      id: `it-${Date.now().toString(36)}`,
      ingredientId: itemForm.ingredientId || undefined,
      name: itemForm.name.trim(),
      quantity: qty,
      unit: itemForm.unit,
      amountRsd: amount,
    });
    setItemForm({ ...emptyItemForm, unit: itemForm.unit });
  }

  function handleIngredientSelect(value: string) {
    const selected = value ? state.ingredients.find((i) => i.id === value) : undefined;
    setItemForm((prev) => ({
      ...prev,
      ingredientId: value,
      name: selected?.name ?? "",
      unit: selected?.unit ?? prev.unit,
    }));
  }

  const liveReport = report
    ? state.reports.find((r) => r.id === report.id) ?? report
    : null;

  function finish() {
    if (!liveReport || liveReport.items.length === 0) {
      toast.error("Dodajte barem jednu stavku u izveštaj.");
      return;
    }
    const result = finalizeReport(liveReport);
    setReport(null);
    if (!result) return;
    toast.success(
      `Izveštaj "${liveReport.label}" je finalizovan. Na zalihu je knjiženo ${result.booked} ${result.booked === 1 ? "namirnica" : "namirnica"}.`,
    );
    if (result.skipped > 0) {
      toast.warning(
        `${result.skipped} ${result.skipped === 1 ? "stavka nije povezana" : "stavke nisu povezane"} sa namirnicom i ne knjiži se na zalihu.`,
      );
    }
  }

  if (!liveReport) {
    return (
      <StaffCard
        description="Odaberite datum nabavke i kreirajte novi izveštaj."
        padding="lg"
        title="Novi izveštaj nabavke"
      >
        <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={staffLabelClass}>Datum nabavke</span>
            <input
              className={staffInputClass}
              onChange={(e) => setDateKey(e.target.value)}
              type="date"
              value={dateKey}
            />
          </label>
          <label className="block">
            <span className={staffLabelClass}>Dobavljač (opciono)</span>
            <input
              className={staffInputClass}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="npr. Market DOO"
              value={supplier}
            />
          </label>
        </div>
        <div className="mt-5">
          <button className={staffButtonPrimaryClass} onClick={startReport} type="button">
            <Plus size={16} />
            Započni izveštaj
          </button>
        </div>
      </StaffCard>
    );
  }

  const total = liveReport.items.reduce((s, it) => s + it.amountRsd, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <StaffCard
          actions={
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {liveReport.label}
            </span>
          }
          padding="lg"
          title="Stavke izveštaja"
        >
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Dodaj stavku</p>
              {itemForm.ingredientId ? (
                <button
                  className="text-xs font-medium text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
                  onClick={() => handleIngredientSelect("")}
                  type="button"
                >
                  Očisti izbor
                </button>
              ) : null}
            </div>

            <label className="block">
              <span className={staffLabelClass}>Namirnica (iz liste)</span>
              <select
                className={staffInputClass}
                onChange={(e) => handleIngredientSelect(e.target.value)}
                value={itemForm.ingredientId}
              >
                <option value="">— izaberite iz liste —</option>
                {ingredientOptions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <label className="block lg:col-span-5">
                <span className={staffLabelClass}>Naziv namirnice</span>
                <input
                  className={staffInputClass}
                  onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="npr. Pileći file"
                  value={itemForm.name}
                />
              </label>
              <label className="block lg:col-span-3">
                <span className={staffLabelClass}>Količina</span>
                <div className="relative">
                  <input
                    className={staffInputClass + " pr-14"}
                    inputMode="decimal"
                    onChange={(e) => setItemForm((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="0"
                    type="number"
                    value={itemForm.quantity}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-[var(--text-muted)]">
                    {ingredientUnitLabels[itemForm.unit]}
                  </span>
                </div>
              </label>
              <label className="block lg:col-span-3">
                <span className={staffLabelClass}>Ukupno (RSD)</span>
                <input
                  className={staffInputClass}
                  inputMode="decimal"
                  onChange={(e) => setItemForm((p) => ({ ...p, amountRsd: e.target.value }))}
                  placeholder="0"
                  type="number"
                  value={itemForm.amountRsd}
                />
              </label>
              <div className="flex items-end lg:col-span-1">
                <button
                  aria-label="Dodaj stavku"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  disabled={!report}
                  onClick={addItem}
                  title="Dodaj stavku"
                  type="button"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <StaffTable empty={liveReport.items.length === 0} emptyTitle="Nema stavki"
              emptyDescription="Dodajte stavke u izveštaj.">
                  <StaffTableHead>
                    <tr>
                      <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
                      <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Količina</th>
                      <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Ukupno (RSD)</th>
                      <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Akcije</th>
                    </tr>
                  </StaffTableHead>
                  <StaffTableBody>
                    {liveReport.items.map((item) => (
                      <tr className="border-t border-[var(--card-border)]" key={item.id}>
                        <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                          <span className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.ingredientId ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                knjiženo
                              </span>
                            ) : (
                              <span
                                className="cursor-help rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500"
                                title="Nije povezana sa namirnicom iz liste — neće biti dodata na zalihu."
                              >
                                nije povezano
                              </span>
                            )}
                          </span>
                        </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">
                      {item.quantity.toLocaleString("sr-RS")} {ingredientUnitLabels[item.unit]}
                    </td>
                    <td className="py-3 pr-4 font-semibold tabular-nums text-[var(--text-primary)]">
                      {item.amountRsd.toLocaleString("sr-RS")} RSD
                    </td>
                    <td className="py-3 text-right">
                      <button
                        aria-label={`Ukloni ${item.name}`}
                        className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600"
                        onClick={() => {
                          removeReportItem(liveReport.id, item.id);
                        }}
                        title="Ukloni"
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </StaffTableBody>
            </StaffTable>
          </div>
        </StaffCard>
      </div>

      <div className="lg:col-span-2">
        <StaffCard padding="lg" title="Zbir i finalizacija">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Ukupna vrednost</p>
              <p className="text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
                {total.toLocaleString("sr-RS")} RSD
              </p>
            </div>
          </div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">
            {liveReport.items.length} {liveReport.items.length === 1 ? "stavka" : "stavki"}
          </div>
          <div className="mt-5 space-y-2">
            <button
              className={staffButtonPrimaryClass + " w-full justify-center"}
              onClick={finish}
              type="button"
            >
              Finalizuj izveštaj
            </button>
            <button
              className={staffButtonSecondaryClass + " w-full justify-center"}
              onClick={() => setReport(null)}
              type="button"
            >
              Odustani
            </button>
          </div>
        </StaffCard>
      </div>
    </div>
  );
}

function ArchiveTab({ state, readOnly }: { state: MagacinState; readOnly?: boolean }) {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcurementReport | null>(null);
  const finalized = useMemo(
    () => state.reports.filter((r) => r.status === "finalized").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reports],
  );

  function printReport(report: ProcurementReport) {
    const total = report.items.reduce((s, it) => s + it.amountRsd, 0);
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
  <div class="total"><span>Ukupno:</span><span>${total.toLocaleString("sr-RS")} RSD</span></div>
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
    const total = report.items.reduce((s, it) => s + it.amountRsd, 0);
    const csv = [
      header,
      ...rows,
      ["", "", "UKUPNO", String(total)],
    ]
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

  return (
    <div className="space-y-3">
      <StaffCard
        description={`${finalized.length} ${finalized.length === 1 ? "arhiviran izveštaj" : "arhiviranih izveštaja"}`}
        padding="lg"
        title="Arhiva izveštaja nabavke"
      >
        {finalized.length === 0 ? (
          <StaffEmptyState
            description="Finalizovani izveštaji će se pojaviti ovde."
            icon={<Package className="text-[var(--text-secondary)]" size={24} />}
            title="Nema arhiviranih izveštaja"
          />
        ) : (
          <div className="space-y-2">
            {finalized.map((report) => {
              const expanded = expandedId === report.id;
              const total = report.items.reduce((s, it) => s + it.amountRsd, 0);
              return (
                <div
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)]"
                  key={report.id}
                >
                  <div className="flex w-full flex-wrap items-center justify-between gap-3 p-4">
                    <button
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : report.id)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">{report.label}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {report.supplier ? `${report.supplier} · ` : ""}
                          {report.items.length} {report.items.length === 1 ? "stavka" : "stavki"} ·{" "}
                          {report.createdBy}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-bold tabular-nums text-[var(--text-primary)]">
                          {total.toLocaleString("sr-RS")} RSD
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {report.dateKey}
                        </span>
                        <ChevronDown
                          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                          size={16}
                        />
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => printReport(report)}
                        title="Štampaj izveštaj"
                        type="button"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => exportReportCsv(report)}
                        title="Izvezi izveštaj (CSV)"
                        type="button"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="border-t border-[var(--card-border)] p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Stavke</p>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                            onClick={() => printReport(report)}
                            type="button"
                          >
                            <Printer size={15} />
                            Štampaj
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                            onClick={() => exportReportCsv(report)}
                            type="button"
                          >
                            <Download size={15} />
                            Izvezi (CSV)
                          </button>
                          {!readOnly ? (
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleteTarget(report)}
                              type="button"
                            >
                              <Trash2 size={15} />
                              Obriši izveštaj
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <StaffTable empty={report.items.length === 0}>
                        <StaffTableHead>
                          <tr>
                            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
                            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Količina</th>
                            <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Ukupno (RSD)</th>
                          </tr>
                        </StaffTableHead>
                        <StaffTableBody>
                          {report.items.map((item) => (
                            <tr className="border-t border-[var(--card-border)]" key={item.id}>
                              <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">
                                <span className="flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {item.ingredientId ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                      knjiženo
                                    </span>
                                  ) : (
                                    <span
                                      className="cursor-help rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500"
                                      title="Nije povezana sa namirnicom iz liste — nije dodata na zalihu."
                                    >
                                      nije povezano
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-[var(--text-secondary)]">
                                {item.quantity.toLocaleString("sr-RS")} {ingredientUnitLabels[item.unit]}
                              </td>
                              <td className="py-2 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                                {item.amountRsd.toLocaleString("sr-RS")} RSD
                              </td>
                            </tr>
                          ))}
                        </StaffTableBody>
                      </StaffTable>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </StaffCard>

      <StaffConfirmDialog
        cancelLabel="Otkaži"
        confirmLabel="Obriši"
        message={`Da li ste sigurni da želite da obrišete izveštaj "${deleteTarget?.label}"? Ova akcija se ne može poništiti.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteReport(deleteTarget!.id);
          setDeleteTarget(null);
          toast.success("Izveštaj je obrisan.");
        }}
        open={Boolean(deleteTarget)}
        title="Brisanje izveštaja"
        variant="danger"
      />
    </div>
  );
}

export function MagacinNabavkaPage() {
  const { state, syncError, retry } = useMagacin();
  const {
    state: recipeState,
    syncError: recipeSyncError,
    retry: retryRecipe,
    dateKey,
    setDateKey,
    mealType,
    setMealType,
    demandLoading,
    demandError,
    plan,
    refreshDemand,
  } = useMagacinRecipe();
  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const [form, setForm] = useState(emptyIngredientForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const { session } = useKuhinjaSessionContext();
  const isKuvar = session?.role === "kuvar";

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

  function openAdd() {
    setForm(emptyIngredientForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(ingredient: Ingredient) {
    setForm({
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      ingredientType: ingredient.ingredientType,
      currentStock: String(ingredient.currentStock),
      minStock: String(ingredient.minStock),
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  }

  function saveIngredient() {
    if (!form.name.trim()) {
      toast.error("Unesite naziv namirnice.");
      return;
    }
    const currentStock = form.currentStock === "" ? 0 : Number(form.currentStock);
    const minStock = form.minStock === "" ? 0 : Number(form.minStock);
    if (Number.isNaN(currentStock) || currentStock < 0 || Number.isNaN(minStock) || minStock < 0) {
      toast.error("Početna zaliha i donja granica moraju biti brojevi veći ili jednaki 0.");
      return;
    }
    if (editingId) {
      updateIngredient(editingId, {
        name: form.name,
        category: form.category,
        unit: form.unit,
        ingredientType: form.ingredientType,
        currentStock,
        minStock,
      });
      toast.success(`Namirnica "${form.name.trim()}" je izmenjena.`);
    } else {
      createIngredient({
        name: form.name,
        category: form.category,
        unit: form.unit,
        ingredientType: form.ingredientType,
        currentStock,
        minStock,
      });
      toast.success(`Namirnica "${form.name.trim()}" je dodata.`);
    }
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      {syncError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{syncError}</p>
          <button className={staffButtonSecondaryClass} onClick={retry} type="button">
            Pokušaj ponovo
          </button>
        </div>
      ) : null}
      {recipeSyncError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{recipeSyncError}</p>
          <button className={staffButtonSecondaryClass} onClick={retryRecipe} type="button">
            Pokušaj ponovo
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <StaffSegmentedControl
          onChange={setActiveTab}
          options={[
            { id: "stock" as const, label: "Lista namirnica" },
            { id: "recipes" as const, label: "Spisak (recepti)" },
            { id: "consumption" as const, label: "Obračun potrošnje" },
            ...(!isKuvar
              ? [
                  { id: "create" as const, label: "Kreiraj izveštaj" },
                  { id: "archive" as const, label: "Arhiva izveštaja" },
                ]
              : []),
          ]}
          value={activeTab}
        />
      </div>

      {activeTab === "stock" ? (
        <StockTab
          consumedNames={consumedNames}
          consumptionDateKey={dateKey}
          onAdd={openAdd}
          onEdit={openEdit}
          readOnly={isKuvar}
          reportDelta={reportDelta}
          state={state}
        />
      ) : activeTab === "recipes" ? (
        <RecipesTab ingredients={state.ingredients} recipeState={recipeState} />
      ) : activeTab === "consumption" ? (
        <ConsumptionTab
          dateKey={dateKey}
          demandError={demandError}
          demandLoading={demandLoading}
          isReadOnly={isKuvar}
          mealType={mealType}
          onCorrectApplied={refreshDemand}
          onDateChange={setDateKey}
          onMealChange={setMealType}
          onRefresh={refreshDemand}
          plan={plan}
        />
      ) : !isKuvar && activeTab === "create" ? (
        <CreateReportTab state={state} />
      ) : !isKuvar && activeTab === "archive" ? (
        <ArchiveTab readOnly={isKuvar} state={state} />
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {editingId ? "Izmeni namirnicu" : "Nova namirnica"}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className={staffLabelClass}>Naziv</span>
                <input
                  className={staffInputClass}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="npr. Pileći file"
                  value={form.name}
                />
              </label>
              <label className="block">
                <span className={staffLabelClass}>Tip namirnice</span>
                <select
                  className={staffInputClass}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ingredientType: e.target.value as IngredientType }))
                  }
                  value={form.ingredientType}
                >
                  {(Object.keys(ingredientTypeLabels) as IngredientType[]).map((t) => (
                    <option key={t} value={t}>
                      {ingredientTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={staffLabelClass}>Kategorija</span>
                  <select
                    className={staffInputClass}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category: e.target.value as IngredientCategory }))
                    }
                    value={form.category}
                  >
                    {(Object.keys(ingredientCategoryLabels) as IngredientCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {ingredientCategoryLabels[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={staffLabelClass}>Jedinica</span>
                  <select
                    className={staffInputClass}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, unit: e.target.value as IngredientUnit }))
                    }
                    value={form.unit}
                  >
                    {(Object.keys(ingredientUnitLabels) as IngredientUnit[]).map((u) => (
                      <option key={u} value={u}>
                        {ingredientUnitLabels[u]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={staffLabelClass}>Početna zaliha ({ingredientUnitLabels[form.unit]})</span>
                  <input
                    className={staffInputClass}
                    inputMode="decimal"
                    onChange={(e) => setForm((p) => ({ ...p, currentStock: e.target.value }))}
                    placeholder="0"
                    type="number"
                    value={form.currentStock}
                  />
                </label>
                <label className="block">
                  <span className={staffLabelClass}>Donja granica ({ingredientUnitLabels[form.unit]})</span>
                  <input
                    className={staffInputClass}
                    inputMode="decimal"
                    onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
                    placeholder="0"
                    type="number"
                    value={form.minStock}
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className={staffButtonSecondaryClass}
                onClick={() => setShowForm(false)}
                type="button"
              >
                Otkaži
              </button>
              <button className={staffButtonPrimaryClass} onClick={saveIngredient} type="button">
                {editingId ? "Sačuvaj izmene" : "Dodaj namirnicu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
