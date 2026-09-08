import { WorkingHoursTable } from "@/components/dashboard/WorkingHoursTable";

export function HelpWorkingHoursTable() {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="border-b border-black/5 px-5 py-4 lg:px-6">
        <h3 className="text-lg font-bold text-black lg:text-xl">Radno vreme menze</h3>
        <p className="mt-1 text-sm font-light text-black/55">
          Vremenski okviri serviranja po tipu obroka.
        </p>
      </div>
      <WorkingHoursTable className="px-5 py-4 lg:px-6 lg:py-5" compact />
    </div>
  );
}
