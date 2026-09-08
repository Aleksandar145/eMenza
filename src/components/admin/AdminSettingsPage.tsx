 "use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import {
  addClosedDate,
  publishNotice,
  removeClosedDate,
  setReservationRules,
  setZetonDepositRsd,
  updateWorkingHours,
} from "@/lib/admin-system-store";
import { StaffCard, staffInputClass, staffButtonPrimaryClass } from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";
import { getDailyMenu, isDailyMenuPublished, loadKuhinjaJelovnikState } from "@/lib/kuhinja-jelovnik-store";
import type { WorkingHoursRow, MealType } from "@/lib/meal-types";

function formatDeadlineText(serviceStart: string, cutoffHours: number): string {
  const [sh, sm] = serviceStart.split(":").map(Number);
  const serviceMin = sh * 60 + sm;
  let deadlineMin = serviceMin - cutoffHours * 60;
  if (deadlineMin >= 0) {
    const h = Math.floor(deadlineMin / 60);
    const m = deadlineMin % 60;
    return `danas do ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const daysBefore = Math.ceil(-deadlineMin / 1440);
  deadlineMin += daysBefore * 1440;
  const h = Math.floor(deadlineMin / 60);
  const m = deadlineMin % 60;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  if (daysBefore === 1) return `dan pre u ${time}`;
  return `${daysBefore} dana pre u ${time}`;
}

const DAY_COLUMNS = [
  { key: "monday", label: "Ponedeljak" },
  { key: "tuesday", label: "Utorak" },
  { key: "wednesday", label: "Sreda" },
  { key: "thursday", label: "Četvrtak" },
  { key: "friday", label: "Petak" },
  { key: "saturday", label: "Subota" },
  { key: "sunday", label: "Nedelja" },
] as const;

function getMaxReservationDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}.`;
}

function inputClass(): string {
  return "rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15";
}

export function AdminSettingsPage() {
  const { state, refresh } = useAdminSystem({ scope: "full" });
  const [closedDateKey, setClosedDateKey] = useState("");
  const [closedDateKeyEnd, setClosedDateKeyEnd] = useState("");
  const [closedReason, setClosedReason] = useState("");
  const toast = useToast();

  const [draftWorkingHours, setDraftWorkingHours] = useState<WorkingHoursRow[]>([]);
  const [reservationDaysDraft, setReservationDaysDraft] = useState(state.reservationAdvanceDays);
  const [bookingCutoffDraft, setBookingCutoffDraft] = useState(state.bookingCutoffHours);
  const [cancellationCutoffDraft, setCancellationCutoffDraft] = useState(state.cancellationCutoffHours);
  const [zetonDraft, setZetonDraft] = useState(state.zetonDepositRsd);
  const [perDayMode, setPerDayMode] = useState(false);
  const workingHoursDirty = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZetonDraft(state.zetonDepositRsd);
  }, [state.zetonDepositRsd]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookingCutoffDraft(state.bookingCutoffHours);
  }, [state.bookingCutoffHours]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCancellationCutoffDraft(state.cancellationCutoffHours);
  }, [state.cancellationCutoffHours]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReservationDaysDraft(state.reservationAdvanceDays);
  }, [state.reservationAdvanceDays]);

  useEffect(() => {
    if (!workingHoursDirty.current && state.workingHours.length > 0) {
      setDraftWorkingHours(state.workingHours.map((r) => ({ ...r })));
    }
  }, [state.workingHours]);

  const router = useRouter();

  const maxResDateKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() + reservationDaysDraft);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const menuStatus = (() => {
    loadKuhinjaJelovnikState();
    const meals: MealType[] = ["breakfast", "lunch", "dinner"];
    const publishedCount = meals.filter((m) => isDailyMenuPublished(maxResDateKey, m)).length;
    if (publishedCount === meals.length) return "published" as const;
    if (publishedCount === 0) return "missing" as const;
    return "partial" as const;
  })();

  function handleGroupedChange(index: number, field: "weekday" | "weekend", value: string) {
    workingHoursDirty.current = true;
    setDraftWorkingHours((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const dayKeys = field === "weekday"
          ? ["monday", "tuesday", "wednesday", "thursday", "friday"]
          : ["saturday", "sunday"];
        return { ...row, [field]: value, ...Object.fromEntries(dayKeys.map((k) => [k, value])) };
      }),
    );
  }

  function handlePerDayChange(index: number, dayKey: string, value: string) {
    workingHoursDirty.current = true;
    setDraftWorkingHours((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const isWeekday = ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(dayKey);
        const field = isWeekday ? "weekday" : "weekend";
        return { ...row, [dayKey]: value, [field]: value };
      }),
    );
  }

  function handleSaveWorkingHours() {
    workingHoursDirty.current = false;
    updateWorkingHours(draftWorkingHours);
    refresh();
    toast.success("Radno vreme sačuvano.");
  }

  return (
    <div className="space-y-5">
      <StaffCard title="Radno vreme menze">
        {perDayMode ? (
          <div className="overflow-x-auto rounded-xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#F8F9FB] text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-3 py-2.5">Obrok</th>
                  {DAY_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-center">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draftWorkingHours.map((row, index) => (
                  <tr key={row.type} className="border-b border-black/5 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-[#1F2937]">
                      {row.meal}
                    </td>
                    {DAY_COLUMNS.map((col) => (
                      <td key={col.key} className="px-3 py-2.5">
                        <input
                          className="w-full rounded-lg border border-[var(--card-border)] bg-white px-2 py-1.5 text-center text-xs text-[#1F2937] focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
                          onChange={(e) => handlePerDayChange(index, col.key, e.target.value)}
                          placeholder="--:-- - --:--"
                          value={(row as Record<string, string | undefined>)[col.key] ?? row.weekday ?? ""}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {state.workingHours.map((row, index) => (
              <div className="grid gap-3 rounded-md bg-[var(--bg-muted)] p-3 sm:grid-cols-3" key={row.type}>
                <p className="self-center text-sm font-semibold text-[var(--text-primary)]">{row.meal}</p>
                <label className="text-xs text-[var(--text-secondary)]">
                  Pon – Pet
                  <input
                    className={`${staffInputClass} mt-1 w-full`}
                    onChange={(e) => handleGroupedChange(index, "weekday", e.target.value)}
                    value={draftWorkingHours[index]?.weekday ?? ""}
                  />
                </label>
                <label className="text-xs text-[var(--text-secondary)]">
                  Sub – Ned
                  <input
                    className={`${staffInputClass} mt-1 w-full`}
                    onChange={(e) => handleGroupedChange(index, "weekend", e.target.value)}
                    value={draftWorkingHours[index]?.weekend ?? ""}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              perDayMode
                ? "bg-[#5055D2] text-white hover:bg-[#4348b8]"
                : "border border-black/10 bg-white text-[#6B7280] hover:bg-[#F8F9FB]"
            }`}
            onClick={() => setPerDayMode((prev) => !prev)}
            type="button"
          >
            {perDayMode ? "Grupisani režim" : "Režim pregleda svakog dana pojedinačno"}
          </button>
          <button className={staffButtonPrimaryClass} onClick={handleSaveWorkingHours} type="button">
            Sačuvaj
          </button>
        </div>
      </StaffCard>

      <div className="rounded-[20px] border border-black/5 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <h2 className="text-base font-bold text-[#1F2937]">Rezervacije hrane</h2>

        <div className="mt-4 rounded-xl border border-black/5 bg-[#F8F9FB] p-4">
          <h3 className="text-sm font-bold text-[#1F2937]">Pravila rezervacije</h3>
          <div className="mt-3 flex gap-6">
            <div className="min-w-0 flex-1 space-y-2.5">
              <label className="flex items-center gap-2 text-sm text-[#6B7280]">
                Broj dana unapred
                <input
                  className={`${inputClass()} w-20`}
                  onChange={(e) => setReservationDaysDraft(Number(e.target.value))}
                  type="number"
                  value={reservationDaysDraft}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#6B7280]">
                Rezervacija najkasnije
                <input
                  className={`${inputClass()} w-16`}
                  onChange={(e) => setBookingCutoffDraft(Number(e.target.value))}
                  type="number"
                  value={bookingCutoffDraft}
                />
                <span>sati pre</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#6B7280]">
                Otkazivanje najkasnije
                <input
                  className={`${inputClass()} w-16`}
                  onChange={(e) => setCancellationCutoffDraft(Number(e.target.value))}
                  type="number"
                  value={cancellationCutoffDraft}
                />
                <span>sati pre</span>
              </label>
              <button
                className="rounded-xl bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4348b8]"
                onClick={() => {
                  if (reservationDaysDraft < 1) {
                    toast.error("Broj dana mora biti veći od 0.");
                    return;
                  }
                  if (bookingCutoffDraft < 1) {
                    toast.error("Rok za rezervisanje mora biti veći od 0.");
                    return;
                  }
                  if (cancellationCutoffDraft < 1) {
                    toast.error("Rok za otkazivanje mora biti veći od 0.");
                    return;
                  }
                  setReservationRules({
                    reservationEnabled: state.reservationEnabled,
                    reservationAdvanceDays: reservationDaysDraft,
                    bookingCutoffHours: bookingCutoffDraft,
                    cancellationCutoffHours: cancellationCutoffDraft,
                  });
                  refresh();
                  toast.success("Pravila rezervacije sačuvana.");
                }}
                type="button"
              >
                Sačuvaj
              </button>
            </div>

            <div className="w-auto shrink-0">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs text-[#6B7280]">
                  Student može rezervisati hranu do{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {getMaxReservationDate(reservationDaysDraft)}
                  </span>
                </p>
                <button
                  className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-tight transition-colors ${
                    menuStatus === "published"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : menuStatus === "partial"
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                  onClick={() => router.push("/admin/raspored")}
                  type="button"
                >
                  {menuStatus === "published"
                    ? "Jelovnik objavljen"
                    : menuStatus === "partial"
                      ? "Jelovnik delimično objavljen"
                      : "Jelovnik nije objavljen"}
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#F8F9FB] text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-3.5 py-2.5">Tip obroka</th>
                      <th className="px-3.5 py-2.5">
                        Rezervacija
                        {bookingCutoffDraft !== state.bookingCutoffHours && (
                          <span className="ml-1.5 inline-block text-[9px] font-bold uppercase tracking-wide text-amber-600">
                            ⬤ promena
                          </span>
                        )}
                      </th>
                      <th className="px-3.5 py-2.5">
                        Otkazivanje
                        {cancellationCutoffDraft !== state.cancellationCutoffHours && (
                          <span className="ml-1.5 inline-block text-[9px] font-bold uppercase tracking-wide text-amber-600">
                            ⬤ promena
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["breakfast", "lunch", "dinner"] as MealType[]).map((type) => {
                      const wh = state.workingHours.find((w) => w.type === type);
                      if (!wh) return null;
                      const serviceStart = wh.weekday.split(" - ")[0];
                      const bookingChanged = bookingCutoffDraft !== state.bookingCutoffHours;
                      const cancellationChanged = cancellationCutoffDraft !== state.cancellationCutoffHours;
                      return (
                        <tr key={type} className="border-b border-black/5 last:border-0">
                          <td className="whitespace-nowrap px-3.5 py-2.5 font-medium text-[#1F2937]">
                            {wh.meal}
                            <span className="ml-1 text-xs text-[#9CA3AF]">({serviceStart})</span>
                          </td>
                          <td className={`whitespace-nowrap px-3.5 py-2.5 ${bookingChanged ? "text-amber-600 font-medium" : "text-[#6B7280]"}`}>
                            {formatDeadlineText(serviceStart, bookingCutoffDraft)}
                          </td>
                          <td className={`whitespace-nowrap px-3.5 py-2.5 ${cancellationChanged ? "text-amber-600 font-medium" : "text-[#6B7280]"}`}>
                            {formatDeadlineText(serviceStart, cancellationCutoffDraft)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-black/5 bg-[#F8F9FB] p-4">
          <h3 className="text-sm font-bold text-[#1F2937]">Neradni dani</h3>
          <p className="mt-1 text-xs text-[#6B7280]">
            Dani kada menza ne radi — rezervacije za ove datume su automatski onemogućene.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-[#6B7280]">
              Od
              <input
                className="mt-1 rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
                onChange={(e) => setClosedDateKey(e.target.value)}
                type="date"
                value={closedDateKey}
              />
            </label>
            <label className="text-xs text-[#6B7280]">
              Do
              <input
                className="mt-1 rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-[#1F2937] focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
                onChange={(e) => setClosedDateKeyEnd(e.target.value)}
                type="date"
                value={closedDateKeyEnd}
              />
            </label>
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
              onChange={(e) => setClosedReason(e.target.value)}
              placeholder="Razlog (odmor, praznik...)"
              value={closedReason}
            />
            <button
              className="rounded-xl bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4348b8]"
              onClick={async () => {
                if (!closedDateKey) return;
                try {
                  const dateKeyEnd = closedDateKeyEnd || undefined;
                  addClosedDate({
                    dateKey: closedDateKey,
                    dateKeyEnd,
                    label: closedDateKey,
                    reason: closedReason || "Neradan dan",
                    blocksReservation: true,
                  });
                  refresh();
                  toast.success("Neradan dan dodat.");

                  const formatDate = (key: string) => {
                    const [y, m, d] = key.split("-");
                    return `${d}. ${m}. ${y}.`;
                  };

                  const period = dateKeyEnd
                    ? `<b>od ${formatDate(closedDateKey)} do ${formatDate(dateKeyEnd)}</b>`
                    : `<b>${formatDate(closedDateKey)}</b>`;

                  await publishNotice({
                    title: "Obaveštenje o radu menze",
                    message: `Poštovani, obaveštavamo vas da menza neće raditi ${period} zbog <b>${closedReason || "Neradan dan"}</b>.`,
                    priority: "important",
                    targets: ["student"],
                  });
                  toast.success("Obaveštenje poslato studentima.");
                } finally {
                  setClosedDateKey("");
                  setClosedDateKeyEnd("");
                  setClosedReason("");
                }
              }}
              type="button"
            >
              Dodaj
            </button>
          </div>
          {state.closedDates.length > 0 ? (
            <div className="mt-3 divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
              {state.closedDates.map((entry) => (
                <div className="flex items-center justify-between px-3.5 py-2 text-sm" key={entry.id}>
                  <span>
                    <span className="font-medium text-[#1F2937]">
                      {entry.dateKey}{entry.dateKeyEnd ? ` — ${entry.dateKeyEnd}` : ""}
                    </span>
                    <span className="ml-2 text-[#6B7280]">{entry.reason}</span>
                  </span>
                  <button
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                    onClick={() => {
                      removeClosedDate(entry.id);
                      refresh();
                      toast.success("Neradan dan uklonjen.");
                    }}
                    type="button"
                  >
                    Ukloni
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-[#6B7280]">Nema dodatih neradnih dana.</p>
          )}
        </div>
      </div>
      <StaffCard title="Kaucija eZetona">
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Iznos depozita koji student ostavlja pri preuzimanju pribora.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#6B7280]">
            Iznos (RSD)
            <input
              className={staffInputClass}
              onChange={(e) => setZetonDraft(Number(e.target.value))}
              type="number"
              value={zetonDraft}
            />
          </label>
          <button
            className={staffButtonPrimaryClass}
            onClick={() => {
              setZetonDepositRsd(zetonDraft);
              refresh();
              toast.success("Kaucija sačuvana.");
            }}
            type="button"
          >
            Sačuvaj
          </button>
        </div>
      </StaffCard>
    </div>
  );
}

export default AdminSettingsPage;
