"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, GraduationCap, Trash2, X } from "lucide-react";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  StaffCard,
  StaffTable,
  StaffTableHead,
  StaffTableBody,
  StaffSegmentedControl,
  staffInputClass,
  staffLabelClass,
  staffButtonPrimaryClass,
} from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";

type Institution = {
  id: string;
  name: string;
  type: "fakultet" | "skola";
  city: string;
  createdAt: string;
  userCount?: number;
};

type ActiveTab = "lista" | "dodaj";

export function AdminFacultiesPage() {
  const toast = useToast();
  const backend = isClientBackendEnabled();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("lista");

  const [name, setName] = useState("");
  const [type, setType] = useState<"fakultet" | "skola">("fakultet");
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [filterType, setFilterType] = useState<"sve" | "fakultet" | "skola">("sve");

  const filteredInstitutions = useMemo(
    () =>
      filterType === "sve"
        ? institutions
        : institutions.filter((i) => i.type === filterType),
    [institutions, filterType],
  );

  const fetchInstitutions = useCallback(async () => {
    if (!backend) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<{ institutions: Institution[] }>("/api/admin/institutions");
      setInstitutions(data.institutions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  }, [backend, toast]);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Naziv je obavezan.");
      return;
    }
    setCreating(true);
    try {
      const data = await apiPost<{ institution: Institution }>("/api/admin/institutions", {
        name: name.trim(),
        type,
        city: city.trim(),
      });
      setInstitutions((prev) => [...prev, data.institution].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setType("fakultet");
      setCity("");
      setActiveTab("lista");
      toast.success("Institucija je dodata.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dodavanje nije uspelo.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiPost(`/api/admin/institutions/${deleteTarget.id}`, undefined);
      setInstitutions((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Institucija je obrisana.");
    } catch {
      await fetchInstitutions();
      setDeleteTarget(null);
      toast.success("Institucija je obrisana.");
    }
  };

  const typeLabel = (t: string) => (t === "fakultet" ? "Fakultet" : "Škola");

  if (!backend) {
    return (
      <StaffCard title="Fakulteti i škole">
        <p className="text-sm text-[var(--text-tertiary)]">
          Ova funkcionalnost zahteva povezan backend (Supabase).
        </p>
      </StaffCard>
    );
  }

  return (
    <div className="space-y-5">
      <StaffSegmentedControl
        options={[
          { id: "lista" as const, label: "Lista institucija" },
          { id: "dodaj" as const, label: "Dodaj instituciju" },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "dodaj" && (
        <StaffCard title="Dodaj fakultet ili školu">
          <div className="mt-4 space-y-4">
            <div>
              <label className={staffLabelClass}>Naziv</label>
              <input
                className={staffInputClass}
                onChange={(e) => setName(e.target.value)}
                placeholder="Npr. Fakultet tehničkih nauka"
                value={name}
              />
            </div>
            <div>
              <label className={staffLabelClass}>Tip</label>
              <select
                className={staffInputClass}
                onChange={(e) => setType(e.target.value as "fakultet" | "skola")}
                value={type}
              >
                <option value="fakultet">Fakultet</option>
                <option value="skola">Škola</option>
              </select>
            </div>
            <div>
              <label className={staffLabelClass}>Grad</label>
              <input
                className={staffInputClass}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Npr. Novi Sad"
                value={city}
              />
            </div>
            <button
              className={staffButtonPrimaryClass}
              disabled={creating || !name.trim()}
              onClick={handleCreate}
              type="button"
            >
              {creating ? "Dodavanje..." : "Dodaj instituciju"}
            </button>
          </div>
        </StaffCard>
      )}

      {activeTab === "lista" && (
        <>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--text-tertiary)]" />
            {(["sve", "fakultet", "skola"] as const).map((f) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterType === f
                    ? "bg-[#5055D2] text-white"
                    : "bg-black/[0.04] text-[var(--text-secondary)] hover:bg-black/[0.08]"
                }`}
                key={f}
                onClick={() => setFilterType(f)}
                type="button"
              >
                {f === "sve" ? "Sve" : f === "fakultet" ? "Fakulteti" : "Škole"}
              </button>
            ))}
          </div>
          <StaffTable>
          <StaffTableHead>
            <tr>
              <th className="px-5 py-3">Naziv</th>
              <th className="px-5 py-3">Tip</th>
              <th className="px-5 py-3">Grad</th>
              <th className="px-5 py-3 text-right">Korisnici</th>
              <th className="px-5 py-3" />
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {loading ? (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]" colSpan={5}>
                  Učitavanje...
                </td>
              </tr>
            ) : filteredInstitutions.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]" colSpan={5}>
                  {filterType === "sve" ? "Nema dodatih institucija." : `Nema dodatih ${filterType === "fakultet" ? "fakulteta" : "škola"}.`}
                </td>
              </tr>
            ) : (
              filteredInstitutions.map((inst) => (
                <tr className="border-t staff-table-row" key={inst.id}>
                  <td className="px-5 py-3 font-medium">{inst.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        inst.type === "fakultet"
                          ? "bg-[#5055D2]/10 text-[#5055D2]"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <GraduationCap size={12} />
                      {typeLabel(inst.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                    {inst.city || "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                    {inst.userCount ?? 0}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      onClick={() => setDeleteTarget({ id: inst.id, name: inst.name })}
                      type="button"
                    >
                      <Trash2 size={14} />
                      Obriši
                    </button>
                  </td>
                </tr>
              ))
            )}
          </StaffTableBody>
          </StaffTable>
        </>)}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={() => setDeleteTarget(null)}
              type="button"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Obriši instituciju
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Da li ste sigurni da želite da obrišete?
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--text-primary)]">
              <span className="font-semibold">{deleteTarget.name}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Ova akcija je nepovratna.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-black/[0.02]"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Otkaži
              </button>
              <button
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                onClick={handleDelete}
                type="button"
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
