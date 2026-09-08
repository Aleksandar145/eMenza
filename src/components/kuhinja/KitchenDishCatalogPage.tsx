"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Archive, Clock, Plus, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import {
  dishCategoryLabels,
  dishStatusLabels,
  type Dish,
  type DishBadge,
  type DishCategory,
} from "@/lib/dish-catalog-mock";
import {
  archiveDish,
  deleteDish,
  proposeDish,
  updateDish,
} from "@/lib/dish-catalog-store";
import { DishBadgeList } from "@/components/dish-catalog/DishBadgeList";
import { DishBadgePicker } from "@/components/dish-catalog/DishBadgePicker";
import { useToast } from "@/components/shared/toast/useToast";
import { StaffConfirmDialog } from "@/components/staff/StaffConfirmDialog";
import {
  StaffCard,
  StaffEmptyState,
  staffInputClass,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  StaffTable,
  StaffTableHead,
  StaffTableBody,
} from "@/components/staff";

const categories: DishCategory[] = ["main", "side", "salad", "dessert"];

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

function StatusBadge({ status }: { status: Dish["status"] }) {
  if (status === "pending_approval") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        <Clock size={10} />
        Na odobrenju
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      Aktivno
    </span>
  );
}

export function KitchenDishCatalogPage() {
  const { state } = useDishCatalog();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<DishCategory | "all">("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Dish | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dish | null>(null);

  const pendingDishes = useMemo(() => {
    return state.dishes.filter((d) => d.status === "pending_approval");
  }, [state.dishes]);

  const activeDishes = useMemo(() => {
    return state.dishes.filter((d) => {
      if (d.status !== "active") return false;
      if (filterCategory !== "all" && d.category !== filterCategory) return false;
      return true;
    });
  }, [state.dishes, filterCategory]);

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

    if (editingId) {
      updateDish(editingId, {
        name: form.name,
        category: form.category,
        priceRsd: form.priceRsd,
        imageUrl: form.imageUrl,
        badges: form.badges,
      });
      toast.success("Jelo je izmenjeno.");
    } else {
      proposeDish({
        name: form.name,
        category: form.category,
        priceRsd: form.priceRsd,
        imageUrl: form.imageUrl,
        badges: form.badges,
      });
      toast.success("Jelo poslato na odobrenje.");
    }

    resetForm();
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    archiveDish(archiveTarget.id);
    toast.success(`Jelo "${archiveTarget.name}" arhivirano.`);
    setArchiveTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteDish(deleteTarget.id);
    toast.success(`Jelo "${deleteTarget.name}" obrisano.`);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      <StaffCard title={editingId ? "Izmena jela" : "Novo jelo u katalogu"}>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Nova jela se šalju na odobrenje adminu. Nakon odobrenja, jelo postaje dostupno u jelovniku.
        </p>
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
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {dishCategoryLabels[cat]}
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            className={`${staffInputClass} max-w-xs`}
            onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
            placeholder="URL slike (ili upload)"
            value={form.imageUrl}
          />
          <input
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-black/5"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload size={14} />
            Upload
          </button>
        </div>

        <div className="mt-3">
          <button
            className="text-sm font-medium text-[#5055D2] hover:underline"
            onClick={() => setShowBadgePicker(!showBadgePicker)}
            type="button"
          >
            {showBadgePicker ? "Sakrij bedževe" : `Bedževi (${form.badges.length})`}
          </button>
          {showBadgePicker ? (
            <div className="mt-2">
              <DishBadgePicker
                value={form.badges}
                onChange={(badges) => setForm((current) => ({ ...current, badges }))}
              />
            </div>
          ) : null}
          {form.badges.length > 0 ? (
            <div className="mt-2">
              <DishBadgeList badges={form.badges} />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            className={staffButtonPrimaryClass}
            disabled={!form.name.trim()}
            onClick={handleSubmit}
            type="button"
          >
            <Plus size={14} />
            {editingId ? "Sačuvaj izmene" : "Pošalji na odobrenje"}
          </button>
          {editingId ? (
            <button className={staffButtonSecondaryClass} onClick={resetForm} type="button">
              Otkaži
            </button>
          ) : null}
        </div>
      </StaffCard>

      {pendingDishes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Čekaju odobrenje
            </h2>
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
              {pendingDishes.length}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingDishes.map((dish) => (
              <div
                className="flex items-start gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50/70 p-4 shadow-sm"
                key={dish.id}
              >
                <DishImage name={dish.name} src={dish.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{dish.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {dishCategoryLabels[dish.category]} · {dish.priceRsd} RSD
                  </p>
                  {dish.badges.length > 0 ? (
                    <div className="mt-1.5">
                      <DishBadgeList badges={dish.badges} />
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="text-xs font-medium text-[#5055D2] hover:underline"
                      onClick={() => startEdit(dish)}
                      type="button"
                    >
                      Izmeni
                    </button>
                    <button
                      className="text-xs font-medium text-red-600 hover:underline"
                      onClick={() => setDeleteTarget(dish)}
                      type="button"
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Aktivna jela</h2>
        <select
          className={`${staffInputClass} min-w-[160px]`}
          onChange={(event) => setFilterCategory(event.target.value as DishCategory | "all")}
          value={filterCategory}
        >
          <option value="all">Sve kategorije</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {dishCategoryLabels[cat]}
            </option>
          ))}
        </select>
      </div>

      {activeDishes.length === 0 ? (
        <StaffEmptyState
          title="Nema aktivnih jela"
          description="Dodajte jelo iz forme iznad ili sačekajte odobrenje poslatih jela."
          icon={<UtensilsCrossed size={24} />}
        />
      ) : (
        <StaffTable>
          <StaffTableHead>
            <tr>
              <th className="px-5 py-3">Slika</th>
              <th className="px-5 py-3">Ime</th>
              <th className="px-5 py-3">Kategorija</th>
              <th className="px-5 py-3">Cena</th>
              <th className="px-5 py-3">Bedževi</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Akcije</th>
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {activeDishes.map((dish) => (
              <tr className="border-t staff-table-row" key={dish.id}>
                <td className="px-5 py-3">
                  <DishImage name={dish.name} src={dish.imageUrl} />
                </td>
                <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{dish.name}</td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">
                  {dishCategoryLabels[dish.category]}
                </td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">{dish.priceRsd} RSD</td>
                <td className="px-5 py-3">
                  <DishBadgeList badges={dish.badges} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={dish.status} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm font-medium text-[#5055D2] hover:underline"
                      onClick={() => startEdit(dish)}
                      type="button"
                    >
                      Izmeni
                    </button>
                    <button
                      className="text-sm font-medium text-amber-600 hover:underline"
                      onClick={() => setArchiveTarget(dish)}
                      type="button"
                    >
                      Arhiviraj
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </StaffTableBody>
        </StaffTable>
      )}

      <StaffConfirmDialog
        open={archiveTarget !== null}
        title="Arhivirati jelo?"
        message={`Jelo "${archiveTarget?.name ?? ""}" biće arhivirano i neće biti dostupno za izbor u jelovniku. Nastaviti?`}
        confirmLabel="Arhiviraj"
        variant="warning"
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <StaffConfirmDialog
        open={deleteTarget !== null}
        title="Obrisati jelo?"
        message={`Jelo "${deleteTarget?.name ?? ""}" će trajno biti obrisano iz kataloga. Nastaviti?`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default KitchenDishCatalogPage;
