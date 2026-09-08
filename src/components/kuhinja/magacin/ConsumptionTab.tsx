"use client";

import { useMemo, useState } from "react";
import { Check, Play, RefreshCw, Wrench } from "lucide-react";
import { useToast } from "@/components/shared/toast/useToast";
import {
  StaffCard,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
  staffLabelClass,
} from "@/components/staff";
import { recipeMealTypeLabels, type ConsumptionPlan } from "@/lib/magacin-recipe-mock";
import { ingredientUnitLabels } from "@/lib/magacin-mock";
import {
  applyConsumption,
  correctIngredientStock,
} from "@/lib/magacin-recipe-store";
import type { MealType } from "@/lib/meal-types";

function fmt(value: number, unit: string) {
  const rounded = Number.isFinite(value) ? Math.round(value * 1000) / 1000 : value;
  return `${rounded.toLocaleString("sr-RS")} ${unit}`;
}

export function ConsumptionTab({
  plan,
  demandLoading,
  demandError,
  dateKey,
  onDateChange,
  mealType,
  onMealChange,
  onRefresh,
  onCorrectApplied,
  isReadOnly,
}: {
  plan: ConsumptionPlan | null;
  demandLoading: boolean;
  demandError: string | null;
  dateKey: string;
  onDateChange: (dateKey: string) => void;
  mealType: MealType;
  onMealChange: (mealType: MealType) => void;
  onRefresh: () => void;
  onCorrectApplied: () => void;
  isReadOnly?: boolean;
}) {
  const toast = useToast();
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [overheadAmounts, setOverheadAmounts] = useState<Record<string, string>>({});

  const applied = plan?.appliedAt !== undefined;

  const mainRows = useMemo(
    () => (plan?.ingredients ?? []).filter((i) => i.ingredientType === "main"),
    [plan],
  );
  const overheadRows = useMemo(
    () => (plan?.ingredients ?? []).filter((i) => i.ingredientType === "overhead"),
    [plan],
  );

  function submitCorrect(ingredientId: string | undefined) {
    if (!ingredientId) return;
    const raw = corrections[ingredientId];
    const delta = Number(raw);
    if (!raw || Number.isNaN(delta)) {
      toast.error("Unesite vrednost korekcije.");
      return;
    }
    correctIngredientStock(ingredientId, delta);
    setCorrections((prev) => ({ ...prev, [ingredientId]: "" }));
    const signLabel = delta >= 0 ? `+${delta.toLocaleString("sr-RS")}` : delta.toLocaleString("sr-RS");
    toast.success(`Zaliha je ispravljena za ${signLabel}.`);
    onCorrectApplied();
  }

  function doApply() {
    if (!plan) return;
    const overheadConsumption = overheadRows
      .map((row) => ({
        ingredientName: row.ingredientName,
        quantity: Number(overheadAmounts[row.ingredientName] ?? "") || 0,
      }))
      .filter((x) => x.quantity > 0);
    applyConsumption(plan, overheadConsumption);
    setOverheadAmounts({});
    toast.success(`Potrošnja za ${plan.dateKey} je primenjena na zalihe.`);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] p-4">
        <label className="block">
          <span className={staffLabelClass}>Datum obračuna</span>
          <input
            className={staffInputClass}
            onChange={(e) => onDateChange(e.target.value)}
            type="date"
            value={dateKey}
          />
        </label>
        <label className="block">
          <span className={staffLabelClass}>Obrok</span>
          <select
            className={staffInputClass}
            onChange={(e) => onMealChange(e.target.value as MealType)}
            value={mealType}
          >
            {(Object.keys(recipeMealTypeLabels) as MealType[]).map((m) => (
              <option key={m} value={m}>
                {recipeMealTypeLabels[m]}
              </option>
            ))}
          </select>
        </label>
        <button className={staffButtonSecondaryClass} onClick={onRefresh} type="button">
          <RefreshCw size={15} />
          Osveži porudžbine
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <StaffCard
          actions={
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                applied ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {applied ? "Primenjeno" : "Nije primenjeno"}
            </span>
          }
          padding="lg"
          title="Obračun potrošnje namirnica"
        >
          <p className="pb-4 text-sm text-[var(--text-secondary)]">
            Za izabrani datum računa se koliko namirnica se potroši na osnovu porudžbina za {plan?.dateKey ?? ""}.
            Ulaz: dnevni meni (ručak). Glavne sirovine se oduzimaju po obroku, a rezijske samo označavaju korist.
          </p>

          <StaffTable empty={(mainRows.length === 0)} emptyTitle="Nema obračuna"
            emptyDescription="Kreirajte spiskove jela i učitajte porudžbine za datum.">
            <StaffTableHead>
              <tr>
                <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica (glavna)</th>
                <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">Zaliha</th>
                <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">Potrebno</th>
                <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">Preostaje</th>
                <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">Može još obroka</th>
                {!isReadOnly ? (
                  <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Korekcija</th>
                ) : null}
              </tr>
            </StaffTableHead>
            <StaffTableBody>
              {mainRows.map((row) => {
                const low = row.remainingAfterMenu < row.minStock;
                return (
                  <tr className="border-t border-[var(--card-border)]" key={row.ingredientName}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{row.ingredientName}</span>
                        {applied ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {fmt(row.currentStock, row.unit)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                      {fmt(row.neededThisMenu, row.unit)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      <span className={low ? "font-semibold text-red-600" : "text-[var(--text-secondary)]"}>
                        {fmt(row.remainingAfterMenu, row.unit)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                      {Number.isFinite(row.servingsPossible)
                        ? `${row.servingsPossible.toLocaleString("sr-RS")} obroka`
                        : "—"}
                    </td>
                    {!isReadOnly ? (
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            aria-label={`Korekcija ${row.ingredientName}`}
                            className={staffInputClass + " w-24 text-right"}
                            inputMode="decimal"
                            onChange={(e) =>
                              setCorrections((prev) => ({
                                ...prev,
                                [row.ingredientName]: e.target.value,
                              }))
                            }
                            placeholder="±"
                            type="number"
                            value={corrections[row.ingredientName] ?? ""}
                          />
                          <button
                            className="inline-flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700"
                            onClick={() => submitCorrect(row.ingredientId)}
                            title="Ispravi zalihu"
                            type="button"
                          >
                            <Wrench size={14} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </StaffTableBody>
          </StaffTable>
        </StaffCard>
      </div>

      <div className="space-y-5">
        <StaffCard padding="lg" title="Primena potrošnje">
          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <RefreshCw size={13} />
            Porudžbine: {plan?.totalServings ?? 0} obroka za {plan?.dateKey ?? ""}.
          </div>
          {!isReadOnly ? (
            <button
              className={staffButtonPrimaryClass + " mt-4 w-full justify-center"}
              disabled={applied}
              onClick={doApply}
              type="button"
            >
              <Play size={16} />
              {applied ? "Potrošnja primenjena" : "Primeni potrošnju"}
            </button>
          ) : null}
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            {applied
              ? "Potrošnja za ovaj dan je već oduzeta sa zalihe."
              : isReadOnly
                ? "Prikaz obračuna potrošnje namirnica za izabrani dan/obrok."
                : "Oduzima koliko se glavnih sirovina potroši prema porudžbinama i označava dan kao obrađen."}
          </p>
        </StaffCard>

        {!isReadOnly ? (
          <StaffCard padding="lg" title="Korekcija zalihe">
            <p className="text-sm text-[var(--text-secondary)]">
              Ako je automatika pogrešila, unesite &quot;+/-&quot; ispravku kraj namirnice u tabeli i potvrdite.
            </p>
          </StaffCard>
        ) : null}

        {!isReadOnly && overheadRows.length ? (
          <StaffCard padding="lg" title="Rezijske namirnice">
            <p className="pb-3 text-right text-sm font-semibold text-[var(--text-secondary)]">
              Ručno unesite koliko je potrošeno
            </p>
            <StaffTable empty={false} emptyTitle="">
              <StaffTableHead>
                <tr>
                  <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
                  <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">
                    Potrošeno (ručno)
                  </th>
                </tr>
              </StaffTableHead>
              <StaffTableBody>
                {overheadRows.map((row) => {
                  const missing = row.currentStock < row.minStock;
                  return (
                    <tr
                      className={`border-t border-[var(--card-border)] ${missing ? "bg-red-50/60" : ""}`}
                      key={row.ingredientName}
                    >
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">{row.ingredientName}</span>
                        </span>
                        {missing ? (
                          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-red-700">
                            <span className="tabular-nums">{fmt(row.currentStock, row.unit)}</span>
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold">
                              Nisko stanje
                            </span>
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                            <span className="tabular-nums">{fmt(row.currentStock, row.unit)}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            aria-label={`Ručna potrošnja ${row.ingredientName}`}
                            className={staffInputClass + " w-20 text-right"}
                            disabled={applied}
                            inputMode="decimal"
                            min={0}
                            onChange={(e) =>
                              setOverheadAmounts((prev) => ({
                                ...prev,
                                [row.ingredientName]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            step="0.001"
                            type="number"
                            value={overheadAmounts[row.ingredientName] ?? ""}
                          />
                          <span className="w-8 text-right text-sm font-medium text-[var(--text-muted)]">
                            {ingredientUnitLabels[row.unit]}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </StaffTableBody>
            </StaffTable>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Količine unete ovde oduzimaju se od zalihe prilikom primene potrošnje.
            </p>
          </StaffCard>
        ) : null}

        {demandLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Učitavanje porudžbina…</p>
        ) : null}
        {demandError ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {demandError}
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
