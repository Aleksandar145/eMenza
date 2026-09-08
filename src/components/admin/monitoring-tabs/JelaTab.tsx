import { useEffect, useMemo, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { StaffCard, StaffSegmentedControl, staffInputClass } from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import { dishCategoryFilterOptions, dishCategoryLabels } from "./shared";

type DishAnalysisItem = {
  id: string;
  name: string;
  category: string;
  priceRsd: number;
  totalCirculation: number;
  totalSold: number;
  remaining: number;
};

export function JelaTab() {
  const [dishFilter, setDishFilter] = useState<string>("all");
  const [dishCategoryFilter, setDishCategoryFilter] = useState<string>("all");
  const [dishSearch, setDishSearch] = useState("");
  const [dishSortField, setDishSortField] = useState<"sold" | "utilization">("sold");
  const [dishSortDir, setDishSortDir] = useState<"desc" | "asc">("desc");
  const [dishData, setDishData] = useState<DishAnalysisItem[] | null>(null);

  const filteredDishData = useMemo(() => {
    let arr = dishData;
    if (dishSearch && arr) {
      arr = arr.filter((d) => d.name.toLowerCase().includes(dishSearch.toLowerCase()));
    }
    if (arr) {
      const copy = [...arr];
      copy.sort((a, b) => {
        const va = dishSortField === "sold" ? a.totalSold : a.totalCirculation > 0 ? Math.round((a.totalSold / a.totalCirculation) * 100) : 0;
        const vb = dishSortField === "sold" ? b.totalSold : b.totalCirculation > 0 ? Math.round((b.totalSold / b.totalCirculation) * 100) : 0;
        return dishSortDir === "desc" ? vb - va : va - vb;
      });
      return copy;
    }
    return arr;
  }, [dishData, dishSearch, dishSortField, dishSortDir]);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const params = new URLSearchParams();
        if (dishCategoryFilter !== "all") params.set("category", dishCategoryFilter);
        const result = await apiGet<DishAnalysisItem[]>(`/api/admin/monitoring/dishes?${params}`);
        setDishData(result);
      } catch {
        setDishData([]);
      }
    };
    fetchDishes();
  }, [dishCategoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
            Kategorija:
          </span>
          <StaffSegmentedControl
            options={dishCategoryFilterOptions}
            value={dishCategoryFilter}
            onChange={setDishCategoryFilter}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            className={staffInputClass + " w-48"}
            type="text"
            placeholder="Pretraži jela..."
            value={dishSearch}
            onChange={(e) => setDishSearch(e.target.value)}
          />
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md border border-[var(--card-border)] bg-white hover:bg-gray-50 text-xs font-medium transition-colors"
            style={{ color: dishSortField === "sold" ? "var(--text-primary)" : "var(--text-muted)" }}
            onClick={() => {
              if (dishSortField === "sold") setDishSortDir((d) => (d === "desc" ? "asc" : "desc"));
              else { setDishSortField("sold"); setDishSortDir("desc"); }
            }}
            title={dishSortField === "sold" ? (dishSortDir === "desc" ? "Prodaja opad. ↓" : "Prodaja rast. ↑") : "Prodaja ↓"}
          >
            P{dishSortField === "sold" ? (dishSortDir === "desc" ? "↓" : "↑") : "↓"}
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md border border-[var(--card-border)] bg-white hover:bg-gray-50 text-xs font-medium transition-colors"
            style={{ color: dishSortField === "utilization" ? "var(--text-primary)" : "var(--text-muted)" }}
            onClick={() => {
              if (dishSortField === "utilization") setDishSortDir((d) => (d === "desc" ? "asc" : "desc"));
              else { setDishSortField("utilization"); setDishSortDir("desc"); }
            }}
            title={dishSortField === "utilization" ? (dishSortDir === "desc" ? "% opad. ↓" : "% rast. ↑") : "% ↓"}
          >
            %{dishSortField === "utilization" ? (dishSortDir === "desc" ? "↓" : "↑") : "↓"}
          </button>
        </div>
      </div>

      {!dishData ? (
        <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
      ) : dishData.length === 0 ? (
        <StaffCard padding="lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UtensilsCrossed className="mb-3 text-[var(--text-muted)]" size={32} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Nema podataka</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Nijedno jelo nije pronađeno za izabranu kategoriju.</p>
          </div>
        </StaffCard>
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left">
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jelo</th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Kategorija</th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pušteno u promet</th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Preostalo</th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none" onClick={() => { setDishSortField("sold"); setDishSortDir((d) => (dishSortField === "sold" ? (d === "desc" ? "asc" : "desc") : "desc")); }}>
                    Prodato {dishSortField === "sold" ? (dishSortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none" onClick={() => { setDishSortField("utilization"); setDishSortDir((d) => (dishSortField === "utilization" ? (d === "desc" ? "asc" : "desc") : "desc")); }}>
                    Iskorišćenost {dishSortField === "utilization" ? (dishSortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                  <th className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {(filteredDishData ?? []).map((item) => {
                  const pct = item.totalCirculation > 0 ? Math.round((item.totalSold / item.totalCirculation) * 100) : 0;
                  const totalBar = item.totalCirculation > 0 ? item.totalCirculation : 1;
                  const soldBar = item.totalSold;
                  const statusLabel =
                    pct > 85 ? "Odlična prodaja" :
                    pct >= 60 ? "Dobra prodaja" :
                    pct >= 30 ? "Slabija prodaja" :
                    "Loša prodaja";
                  const statusDot =
                    pct > 85 ? "🟢" :
                    pct >= 60 ? "🟡" :
                    pct >= 30 ? "🟠" :
                    "🔴";
                  return (
                  <tr key={item.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)]">{item.name}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{dishCategoryLabels[item.category] ?? item.category}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{item.totalCirculation}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{item.remaining}</td>
                    <td className="px-4 py-2.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden min-w-[80px]">
                          <div
                            className={`h-full rounded-full ${pct > 85 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : pct >= 30 ? "bg-orange-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-[var(--text-primary)] whitespace-nowrap">{item.totalSold}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">{pct}%</td>
                    <td className="px-4 py-2.5 text-sm whitespace-nowrap">{statusDot} {statusLabel}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {(filteredDishData ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Nema jela koja odgovaraju pretrazi.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
