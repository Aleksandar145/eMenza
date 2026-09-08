"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/shared/toast/useToast";
import {
  StaffConfirmDialog,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
  staffLabelClass,
} from "@/components/staff";
import {
  ingredientUnitLabels,
  type Ingredient,
} from "@/lib/magacin-mock";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { dishCategoryLabels } from "@/lib/dish-catalog-mock";
import type { DishRecipe, RecipeState } from "@/lib/magacin-recipe-mock";
import {
  deleteRecipe,
  upsertRecipe,
  type RecipeEntryInput,
} from "@/lib/magacin-recipe-store";

type EntryDraft = {
  ingredientId: string;
  ingredientName: string;
  unit: Ingredient["unit"];
  ingredientType: Ingredient["ingredientType"];
  perServing: string;
  used: boolean;
};

function toEntryDraft(ingredient: Ingredient): EntryDraft {
  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    ingredientType: ingredient.ingredientType,
    perServing: "",
    used: false,
  };
}

function EntryRow({
  draft,
  onChange,
}: {
  draft: EntryDraft;
  onChange: (next: EntryDraft) => void;
}) {
  if (draft.ingredientType === "overhead") {
    return (
      <tr className="border-t border-[var(--card-border)]">
        <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">
          <div className="flex items-center gap-2">
            {draft.ingredientName}
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              Rezijska namirnica
            </span>
          </div>
        </td>
        <td className="py-2 pr-4 text-right">
          <button
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              draft.used ? "bg-blue-600" : "bg-gray-300"
            }`}
            onClick={() => onChange({ ...draft, used: !draft.used })}
            type="button"
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                draft.used ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </td>
        <td className="py-2 text-right text-sm text-[var(--text-secondary)]">
          {draft.used ? "Da" : "Ne"}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[var(--card-border)]">
      <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{draft.ingredientName}</td>
      <td className="py-2 pr-4">
        <div className="flex items-center justify-end gap-2">
          <input
            className={staffInputClass + " w-24 text-right"}
            inputMode="decimal"
            min={0}
            onChange={(e) => onChange({ ...draft, perServing: e.target.value })}
            placeholder="0"
            step="0.001"
            type="number"
            value={draft.perServing}
          />
          <span className="w-8 text-right text-sm font-medium text-[var(--text-muted)]">
            {ingredientUnitLabels[draft.unit]}
          </span>
        </div>
      </td>
      <td className="py-2 text-right text-sm text-[var(--text-secondary)]">
        po obroku
      </td>
    </tr>
  );
}

export function RecipesTab({
  recipeState,
  ingredients,
}: {
  recipeState: RecipeState;
  ingredients: Ingredient[];
}) {
  const toast = useToast();
  const { state: dishCatalog } = useDishCatalog();
  const [showEditor, setShowEditor] = useState(false);
  const [dishName, setDishName] = useState("");
  const [totalGrams, setTotalGrams] = useState("");
  const [drafts, setDrafts] = useState<EntryDraft[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DishRecipe | null>(null);

  const dishOptions = useMemo(() => {
    const catalogDishes = [...dishCatalog.dishes]
      .sort((a, b) => a.name.localeCompare(b.name));
    const known = new Set(catalogDishes.map((d) => d.name.toLowerCase()));
    return { catalogDishes, known };
  }, [dishCatalog.dishes]);

  const catalogGroups = useMemo(
    () =>
      (Object.keys(dishCategoryLabels) as (keyof typeof dishCategoryLabels)[])
        .map((category) => ({
          label: dishCategoryLabels[category],
          dishes: dishOptions.catalogDishes.filter((d) => d.category === category),
        }))
        .filter((g) => g.dishes.length > 0),
    [dishOptions.catalogDishes],
  );

  const mainDrafts = useMemo(
    () => drafts.filter((d) => d.ingredientType === "main"),
    [drafts],
  );
  const overheadDrafts = useMemo(
    () => drafts.filter((d) => d.ingredientType === "overhead"),
    [drafts],
  );

  const sorted = useMemo(
    () => [...recipeState.recipes].sort((a, b) => a.dishName.localeCompare(b.dishName)),
    [recipeState.recipes],
  );

  function openNew() {
    setDishName("");
    setTotalGrams("");
    setDrafts(ingredients.map(toEntryDraft));
    setShowEditor(true);
  }

  function openEdit(recipe: DishRecipe) {
    setDishName(recipe.dishName);
    setTotalGrams(
      recipe.totalGramsPerPortion ? String(recipe.totalGramsPerPortion) : "",
    );
    setDrafts(
      ingredients.map((ingredient) => {
        const existing = recipe.entries.find(
          (e) => e.ingredientName.toLowerCase() === ingredient.name.toLowerCase(),
        );
        return existing
          ? {
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              unit: ingredient.unit,
              ingredientType: ingredient.ingredientType,
              perServing: existing.perServing > 0 ? String(existing.perServing) : "",
              used: existing.used,
            }
          : toEntryDraft(ingredient);
      }),
    );
    setShowEditor(true);
  }

  function save() {
    if (!dishName.trim()) {
      toast.error("Izaberite jelo iz liste.");
      return;
    }
    const entries: RecipeEntryInput[] = drafts
      .filter((d) => d.used || (Number(d.perServing) || 0) > 0)
      .map((d) => ({
        ingredientId: d.ingredientId,
        ingredientName: d.ingredientName,
        unit: d.unit,
        perServing: Number(d.perServing) || 0,
        used: d.used,
      }));
    upsertRecipe(dishName.trim(), entries, Number(totalGrams) || undefined);
    toast.success(`Spisak za "${dishName.trim()}" je sačuvan.`);
    setShowEditor(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Spisak (recept) po jelu – koliko se koja namirnica potroši po jednom obroku.
        </p>
        <button className={staffButtonPrimaryClass} onClick={openNew} type="button">
          <Plus size={16} />
          Novi spisak
        </button>
      </div>

      <StaffTable empty={sorted.length === 0} emptyTitle="Nema spiskova"
        emptyDescription="Kreirajte prvi spisak za neko jelo.">
        <StaffTableHead>
          <tr>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Jelo</th>
            <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Sastojci</th>
            <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Akcije</th>
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {sorted.map((recipe) => {
            const overhead = recipe.entries.filter((e) => e.used);
            return (
              <tr className="border-t border-[var(--card-border)]" key={recipe.dishName}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-[var(--text-primary)]">{recipe.dishName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {recipe.entries.length} namirnica
                    {recipe.totalGramsPerPortion
                      ? ` · Ukupno ${recipe.totalGramsPerPortion} g/porc`
                      : ""}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex max-w-md flex-wrap gap-1.5">
                    {recipe.entries.slice(0, 8).map((e) => (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          e.perServing > 0 || e.used
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-500 line-through"
                        }`}
                        key={e.id}
                      >
                        {e.ingredientName}
                        {e.perServing > 0
                          ? ` · ${e.perServing} ${ingredientUnitLabels[e.unit]}`
                          : ""}
                      </span>
                    ))}
                    {recipe.entries.length > 8 ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        +{recipe.entries.length - 8}
                      </span>
                    ) : null}
                  </div>
                  {overhead.length ? (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Rezijske: {overhead.map((o) => o.ingredientName).join(", ")}
                    </p>
                  ) : null}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className={staffButtonSecondaryClass}
                      onClick={() => openEdit(recipe)}
                      type="button"
                    >
                      Izmeni
                    </button>
                    <button
                      aria-label={`Obriši spisak ${recipe.dishName}`}
                      className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDeleteTarget(recipe)}
                      title="Obriši spisak"
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </StaffTableBody>
      </StaffTable>

      <StaffConfirmDialog
        cancelLabel="Otkaži"
        confirmLabel="Obriši"
        message={`Da li ste sigurni da želite da obrišete spisak za "${deleteTarget?.dishName}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRecipe(deleteTarget.dishName);
          setDeleteTarget(null);
          toast.success("Spisak je obrisan.");
        }}
        open={Boolean(deleteTarget)}
        title="Brisanje spiska"
        variant="danger"
      />

      {showEditor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowEditor(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Spisak jela – koliko se potroši po obroku
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex size-3 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                +
              </span>
              Glavne sirovine – unesite tačnu potrošnju po obroku.
              <span className="inline-flex size-3 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                ~
              </span>
              Rezijske – samo označite da li se koriste.
            </div>

            <label className="mt-3 block">
              <span className={staffLabelClass}>Jelo (iz postojećih jela)</span>
              <select
                className={staffInputClass}
                onChange={(e) => setDishName(e.target.value)}
                value={dishName}
              >
                <option value="">— izaberite jelo —</option>
                {!dishOptions.known.has(dishName.toLowerCase()) && dishName ? (
                  <option value={dishName}>{dishName}</option>
                ) : null}
                {catalogGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.dishes.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className={staffLabelClass}>Ukupno g / porcija</span>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                Masa cele porcije jela u gramima – koristi se za obračun &quot;g/porc&quot; u pripremi.
              </span>
              <input
                className={staffInputClass + " mt-2 w-40 text-right"}
                inputMode="decimal"
                min={0}
                onChange={(e) => setTotalGrams(e.target.value)}
                placeholder="npr. 450"
                step="1"
                type="number"
                value={totalGrams}
              />
            </label>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="mb-1.5 text-sm font-semibold text-[var(--text-primary)]">
                Glavne sirovine
              </p>
              <div className="rounded-xl border border-[var(--card-border)]">
                <StaffTable empty={mainDrafts.length === 0} emptyTitle="Nema glavnih sirovina">
                  <StaffTableHead>
                    <tr>
                      <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
                      <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">
                        Potrošnja / obrok
                      </th>
                      <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Koristi se</th>
                    </tr>
                  </StaffTableHead>
                  <StaffTableBody>
                    {mainDrafts.map((d) => (
                      <EntryRow
                        draft={d}
                        key={d.ingredientId}
                        onChange={(next) =>
                          setDrafts((prev) =>
                            prev.map((p) => (p.ingredientId === next.ingredientId ? next : p)),
                          )
                        }
                      />
                    ))}
                  </StaffTableBody>
                </StaffTable>
              </div>

              <p className="mb-1.5 mt-5 text-sm font-semibold text-[var(--text-primary)]">
                Rezijske namirnice
              </p>
              <div className="rounded-xl border border-[var(--card-border)]">
                <StaffTable empty={overheadDrafts.length === 0} emptyTitle="Nema rezijskih namirnica">
                  <StaffTableHead>
                    <tr>
                      <th className="py-2 pr-4 text-left font-semibold text-[var(--text-secondary)]">Namirnica</th>
                      <th className="py-2 pr-4 text-right font-semibold text-[var(--text-secondary)]">
                        Koristi se u jelu
                      </th>
                      <th className="py-2 text-right font-semibold text-[var(--text-secondary)]">Da/Ne</th>
                    </tr>
                  </StaffTableHead>
                  <StaffTableBody>
                    {overheadDrafts.map((d) => (
                      <EntryRow
                        draft={d}
                        key={d.ingredientId}
                        onChange={(next) =>
                          setDrafts((prev) =>
                            prev.map((p) => (p.ingredientId === next.ingredientId ? next : p)),
                          )
                        }
                      />
                    ))}
                  </StaffTableBody>
                </StaffTable>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className={staffButtonSecondaryClass}
                onClick={() => setShowEditor(false)}
                type="button"
              >
                Otkaži
              </button>
              <button className={staffButtonPrimaryClass} onClick={save} type="button">
                <Save size={16} />
                Sačuvaj spisak
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
