"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Archive, Loader2, Plus, Tag, Trash2, Upload, UtensilsCrossed, ChevronDown } from "lucide-react";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import {
  dishCategoryLabels,
  dishStatusLabels,
  type Dish,
  type DishBadge,
  type DishCategory,
  type DishStatus,
} from "@/lib/dish-catalog-mock";
import {
  approveDish,
  archiveDish,
  createDish,
  deleteDish,
  unarchiveDish,
  updateDish,
} from "@/lib/dish-catalog-store";
import { getCustomBadgeDefs } from "@/lib/custom-badges-store";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { DishBadgePicker } from "@/components/dish-catalog/DishBadgePicker";
import { BadgeCreatorDialog } from "@/components/admin/BadgeCreatorDialog";
import { useToast } from "@/components/shared/toast/useToast";
import {
  StaffCard,
  StaffConfirmDialog,
  StaffEmptyState,
  staffInputClass,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  StaffTable,
  StaffTableHead,
  StaffTableBody,
} from "@/components/staff";

const categories: DishCategory[] = ["main", "side", "salad", "dessert"];
const statuses: DishStatus[] = ["active", "pending_approval"];

const emptyForm = {
  name: "",
  category: "main" as DishCategory,
  priceRsd: 0,
  imageUrl: "",
  badges: [] as DishBadge[],
};

function DishImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
        <UtensilsCrossed size={18} />
      </div>
    );
  }

  return (
    <div className="relative size-12 overflow-hidden rounded-lg bg-[var(--bg-muted)]">
      <Image alt="" className="object-cover" fill onError={() => setFailed(true)} src={src} unoptimized />
    </div>
  );
}

export function AdminDishCatalogPage() {
  const { state, syncError, isEmpty, retry } = useDishCatalog();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<DishCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DishStatus | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBadgeCreator, setShowBadgeCreator] = useState(false);
  const [customBadgeKey, setCustomBadgeKey] = useState(0);
  const [deleteDishTarget, setDeleteDishTarget] = useState<Dish | null>(null);
  const archivedRef = useRef<HTMLDivElement>(null);
  const customBadgeDefs = getCustomBadgeDefs();

  function scrollToArchived() {
    archivedRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const filtered = useMemo(() => {
    return state.dishes.filter((dish) => {
      if (dish.status === "archived") return false;
      if (filterCategory !== "all" && dish.category !== filterCategory) return false;
      if (filterStatus !== "all" && dish.status !== filterStatus) return false;
      return true;
    });
  }, [state.dishes, filterCategory, filterStatus]);

  const archivedDishes = useMemo(() => {
    return state.dishes.filter((dish) => dish.status === "archived");
  }, [state.dishes]);

  const hasActiveFilters = filterCategory !== "all" || filterStatus !== "all";

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(dish: Dish) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setEditingId(dish.id);
    setForm({
      name: dish.name,
      category: dish.category,
      priceRsd: dish.priceRsd,
      imageUrl: dish.imageUrl,
      badges: dish.badges,
    });
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    const url = form.imageUrl.trim();
    if (url && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/") && !url.startsWith("data:")) {
      toast.error("URL slike mora početi sa http://, https://, / ili data:");
      return;
    }

    setIsSubmitting(true);
    const label = editingId ? "izmenjeno" : "dodato";

    if (editingId) {
      updateDish(editingId, {
        name: form.name,
        category: form.category,
        priceRsd: form.priceRsd,
        imageUrl: form.imageUrl,
        badges: form.badges,
      });
    } else {
      createDish({
        name: form.name,
        category: form.category,
        priceRsd: form.priceRsd,
        imageUrl: form.imageUrl,
        badges: form.badges,
        proposedBy: "admin",
        status: "active",
      });
    }

    resetForm();
    setIsSubmitting(false);
    toast.success(`Jelo je ${label}.`);
  }

  function handleDelete(dish: Dish) {
    setDeleteDishTarget(dish);
  }

  return (
    <div className="space-y-5">
      {syncError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-semibold">Greška pri sinhronizaciji:</span> {syncError}
          </div>
          <button
            className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
            onClick={retry}
            type="button"
          >
            Pokušaj ponovo
          </button>
        </div>
      ) : null}

      <StaffCard title={editingId ? "Izmena jela" : "Novo jelo u katalogu"}>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            className={staffInputClass}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ime jela"
            value={form.name}
          />
          <select
            className={staffInputClass}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value as DishCategory }))
            }
            value={form.category}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {dishCategoryLabels[category]}
              </option>
            ))}
          </select>
          <input
            className={staffInputClass}
            min={0}
            onChange={(event) =>
              setForm((current) => ({ ...current, priceRsd: Number(event.target.value) || 0 }))
            }
            placeholder="Cena (RSD)"
            type="number"
            value={form.priceRsd || ""}
          />
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              className={`${staffInputClass} flex-1`}
              onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
              placeholder="URL slike (opciono)"
              value={form.imageUrl}
            />
            <input
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              type="file"
            />
            <button
              className={`${staffButtonSecondaryClass} shrink-0`}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload aria-hidden="true" size={16} />
              Uvezi sliku
            </button>
          </div>
          <DishBadgePicker
            customDefs={customBadgeDefs}
            onChange={(badges) => setForm((current) => ({ ...current, badges }))}
            value={form.badges}
            key={customBadgeKey}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className={staffButtonPrimaryClass}
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Plus aria-hidden="true" size={16} />
            )}
            {editingId ? "Sačuvaj izmene" : "Dodaj jelo"}
          </button>
          <button
            className={staffButtonSecondaryClass}
            onClick={() => setShowBadgeCreator(true)}
            type="button"
          >
            <Tag aria-hidden="true" size={16} />
            Kreiraj bedž
          </button>
          {editingId ? (
            <button className={staffButtonSecondaryClass} onClick={resetForm} type="button">
              Otkaži
            </button>
          ) : null}
          {archivedDishes.length > 0 ? (
            <button
              className={`${staffButtonSecondaryClass} ml-auto`}
              onClick={scrollToArchived}
              type="button"
            >
              <ChevronDown aria-hidden="true" size={16} />
              Arhivirana jela ({archivedDishes.length})
            </button>
          ) : null}
        </div>
      </StaffCard>

      {showBadgeCreator ? (
        <BadgeCreatorDialog
          onClose={() => {
            setShowBadgeCreator(false);
            setCustomBadgeKey((k) => k + 1);
          }}
        />
      ) : null}

      <div className="flex gap-2">
        <select
          className={`${staffInputClass} w-auto flex-1`}
          onChange={(event) =>
            setFilterCategory(event.target.value === "all" ? "all" : (event.target.value as DishCategory))
          }
          value={filterCategory}
        >
          <option value="all">Sve kategorije</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {dishCategoryLabels[category]}
            </option>
          ))}
        </select>
        <select
          className={`${staffInputClass} w-auto flex-1`}
          onChange={(event) =>
            setFilterStatus(event.target.value === "all" ? "all" : (event.target.value as DishStatus))
          }
          value={filterStatus}
        >
          <option value="all">Svi statusi</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {dishStatusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {isEmpty ? (
        <StaffEmptyState
          description={hasActiveFilters ? "Pokušajte da promenite filtere." : "Dodajte prvo jelo u katalog."}
          title="Nema jela"
        />
      ) : filtered.length === 0 ? (
        <StaffEmptyState
          description="Nijedno jelo ne odgovara izabranim filterima."
          title="Nema rezultata"
        />
      ) : (
        <div>
          <StaffTable>
            <StaffTableHead>
              <tr>
                <th className="px-5 py-3">Slika</th>
                <th className="px-5 py-3">Ime</th>
                <th className="px-5 py-3">Kategorija</th>
                <th className="px-5 py-3">Cena</th>
                <th className="px-5 py-3">Bedževi</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </StaffTableHead>
            <StaffTableBody>
              {filtered.map((dish) => (
                <tr className="border-t staff-table-row" key={dish.id}>
                  <td className="px-5 py-3">
                    <DishImage name={dish.name} src={dish.imageUrl} />
                  </td>
                  <td className="px-5 py-3 font-medium">{dish.name}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {dishCategoryLabels[dish.category]}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{dish.priceRsd} RSD</td>
                  <td className="px-5 py-3">
                    <DishBadgeList badges={dish.badges} customDefs={customBadgeDefs} />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        dish.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {dishStatusLabels[dish.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="text-xs font-semibold text-[var(--accent-primary)]"
                        onClick={() => startEdit(dish)}
                        type="button"
                      >
                        Izmeni
                      </button>
                      {dish.status === "pending_approval" ? (
                        <button
                          className="text-xs font-semibold text-emerald-700"
                          onClick={() => {
                            approveDish(dish.id);
                            toast.success("Jelo je odobreno.");
                          }}
                          type="button"
                        >
                          Odobri
                        </button>
                      ) : null}
                      <button
                        className="text-xs font-semibold text-red-600"
                        onClick={() => {
                          archiveDish(dish.id);
                          toast.success("Jelo je arhivirano.");
                        }}
                        type="button"
                      >
                        Arhiviraj
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600/60 hover:text-red-600"
                        onClick={() => handleDelete(dish)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={12} />
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </StaffTableBody>
          </StaffTable>
        </div>
      )}

      {archivedDishes.length > 0 ? (
        <div ref={archivedRef}>
          <StaffCard title={`Arhivirana jela (${archivedDishes.length})`}>
          <div className="mt-4">
            <StaffTable>
              <StaffTableHead>
                <tr>
                  <th className="px-5 py-3">Slika</th>
                  <th className="px-5 py-3">Ime</th>
                  <th className="px-5 py-3">Kategorija</th>
                  <th className="px-5 py-3">Cena</th>
                  <th className="px-5 py-3">Bedževi</th>
                  <th className="px-5 py-3" />
                </tr>
              </StaffTableHead>
              <StaffTableBody>
                {archivedDishes.map((dish) => (
                  <tr className="border-t staff-table-row" key={dish.id}>
                    <td className="px-5 py-3">
                      <DishImage name={dish.name} src={dish.imageUrl} />
                    </td>
                    <td className="px-5 py-3 font-medium">{dish.name}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {dishCategoryLabels[dish.category]}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{dish.priceRsd} RSD</td>
                    <td className="px-5 py-3">
                      <DishBadgeList badges={dish.badges} customDefs={customBadgeDefs} />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                        onClick={() => {
                          unarchiveDish(dish.id);
                          toast.success(`Jelo "${dish.name}" je vraćeno u aktivna.`);
                        }}
                        type="button"
                      >
                        <Archive aria-hidden="true" size={14} />
                        Vrati u aktivna
                      </button>
                    </td>
                  </tr>
                ))}
              </StaffTableBody>
            </StaffTable>
          </div>
        </StaffCard>
        </div>
      ) : null}

      <StaffConfirmDialog
        open={Boolean(deleteDishTarget)}
        title="Obriši jelo"
        message={`Da li ste sigurni da želite da obrišete jelo "${deleteDishTarget?.name ?? ""}"?`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={() => {
          if (deleteDishTarget) {
            deleteDish(deleteDishTarget.id);
            toast.success(`Jelo "${deleteDishTarget.name}" je obrisano.`);
          }
          setDeleteDishTarget(null);
        }}
        onCancel={() => setDeleteDishTarget(null)}
      />
    </div>
  );
}
