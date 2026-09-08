import { useEffect, useState } from "react";
import { HelpCircle, UtensilsCrossed, X } from "lucide-react";
import { StaffCard } from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import type { DishPopularityRow } from "@/app/api/admin/monitoring/dish-popularity/route";
import { dishCategoryLabels, SectionCard } from "./shared";

export function PopularnostTab() {
  const [popData, setPopData] = useState<DishPopularityRow[] | null>(null);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    apiGet<DishPopularityRow[]>("/api/admin/monitoring/dish-popularity").then(setPopData).catch(() => setPopData(null));
  }, []);

  return (
    <div className="space-y-4">
      {!popData ? (
        <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
      ) : popData.length === 0 ? (
        <StaffCard padding="lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UtensilsCrossed className="mb-3 text-[var(--text-muted)]" size={32} />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Nema podataka</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Nijedno jelo nije rangirano od strane studenata.</p>
          </div>
        </StaffCard>
      ) : (
        <SectionCard title="Popularnost obroka (rangiranje studenata)">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--text-muted)]">Studenti biraju top 3 jela — formira se rang lista po kategorijama.</p>
            <button
              type="button"
              onClick={() => setShowFormula(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            >
              <HelpCircle size={14} />
              Kako se računa?
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["main", "side", "salad", "dessert"] as const).map((cat) => {
              const items = popData.filter((d) => d.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{dishCategoryLabels[cat]}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[var(--card-border)]">
                        <th className="pb-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Jelo</th>
                        <th className="pb-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Glasova</th>
                        <th className="pb-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">#1</th>
                        <th className="pb-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">#2</th>
                        <th className="pb-1.5 pr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">#3</th>
                        <th className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center">Prosek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((d) => {
                        const tv = d.totalVotes;
                        const p1 = tv > 0 ? d.rank1Count / tv : 0;
                        const p2 = tv > 0 ? d.rank2Count / tv : 0;
                        const p3 = tv > 0 ? d.rank3Count / tv : 0;
                        const avg = tv > 0 ? ((d.rank1Count * 1 + d.rank2Count * 2 + d.rank3Count * 3) / tv) : 0;
                        const avgStr = tv > 0 ? avg.toFixed(2) : "—";
                        const avgColor = avg <= 1.5 ? "text-emerald-600" : avg <= 2.0 ? "text-amber-600" : avg <= 2.5 ? "text-orange-600" : "text-red-600";
                        const bg1 = p1 >= 0.5 ? "bg-emerald-100 text-emerald-900" : p1 >= 0.3 ? "bg-emerald-50 text-emerald-800" : "";
                        const bg2 = p2 >= 0.4 ? "bg-amber-100 text-amber-900" : p2 >= 0.25 ? "bg-amber-50 text-amber-800" : "";
                        const bg3 = p3 >= 0.4 ? "bg-red-100 text-red-900" : p3 >= 0.25 ? "bg-red-50 text-red-800" : "";
                        return (
                          <tr key={d.dishId} className="border-b border-[var(--card-border)] last:border-0">
                            <td className="py-2 pr-2 text-sm font-semibold text-[var(--text-primary)]">{d.dishName}</td>
                            <td className="py-2 pr-2 text-sm text-[var(--text-primary)]">{tv}</td>
                            <td className={`py-2 pr-2 text-sm text-center font-semibold rounded ${bg1}`}>{d.rank1Count}</td>
                            <td className={`py-2 pr-2 text-sm text-center font-semibold rounded ${bg2}`}>{d.rank2Count}</td>
                            <td className={`py-2 pr-2 text-sm text-center font-semibold rounded ${bg3}`}>{d.rank3Count}</td>
                            <td className={`py-2 text-sm text-center font-semibold ${avgColor}`}>{avgStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Formula explanation popup */}
      {showFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFormula(false)}>
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-[var(--card-border)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFormula(false)}
              className="absolute top-4 right-4 rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Kako se računa popularnost?</h3>
            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                Studenti biraju <strong className="text-[var(--text-primary)]">top 3 omiljena jela</strong> iz svake kategorije (glavno jelo, prilog, salata, dezert).
              </p>
              <div className="rounded-lg bg-[var(--bg-primary)] p-3">
                <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Formula prosečne pozicije:</p>
                <p className="font-mono text-xs text-[var(--text-primary)]">
                  Prosek = (Glasovi#1 × 1 + Glasovi#2 × 2 + Glasovi#3 × 3) / Ukupno glasova
                </p>
              </div>
              <p>
                Što je prosek <strong className="text-emerald-600">manji</strong> — jelo je <strong className="text-[var(--text-primary)]">popularnije</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong className="text-emerald-600">1.00–1.50</strong> — Veoma popularno (većina bira kao #1)</li>
                <li><strong className="text-amber-600">1.51–2.00</strong> — Popularno</li>
                <li><strong className="text-orange-600">2.01–2.50</strong> — Srednje popularno</li>
                <li><strong className="text-red-600">2.51–3.00</strong> — Manje popularno</li>
              </ul>
              <p className="text-xs text-[var(--text-muted)]">
                Boje u tabeli označavaju udeo glasova: zelena = više od 50% za tu poziciju, žuta = više od 30%, crvena = više od 25%.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
