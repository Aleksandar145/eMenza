import { useEffect, useState } from "react";
import {
  UtensilsCrossed,
  Users,
  GraduationCap,
  School,
  Building2,
  UserCheck,
  CalendarCheck,
  Cross,
  Moon,
  HelpCircle,
  Infinity,
} from "lucide-react";
import { StaffCard, staffInputClass } from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import type { UsersMonitoringRow } from "@/app/api/admin/monitoring/users/route";
import { addDays, todayStr, SectionCard } from "./shared";

export function KorisniciTab() {
  const [usersData, setUsersData] = useState<UsersMonitoringRow | null>(null);
  const [usersAllTime, setUsersAllTime] = useState(false);
  const [usersFrom, setUsersFrom] = useState(addDays(todayStr(), -29));
  const [usersTo, setUsersTo] = useState(todayStr());
  const usersLength = usersAllTime ? 0 : Math.ceil((new Date(usersTo).getTime() - new Date(usersFrom).getTime()) / 86400000) + 1;

  useEffect(() => {
    const params = usersAllTime ? "" : `?from=${usersFrom}&to=${usersTo}`;
    apiGet<UsersMonitoringRow>(`/api/admin/monitoring/users${params}`).then(setUsersData).catch(() => setUsersData(null));
  }, [usersFrom, usersTo, usersAllTime]);

  return (
    <div className="space-y-4">
      {/* Date range + Generalno toggle */}
      <StaffCard padding="md">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {!usersAllTime ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Od:</span>
                <input className={staffInputClass + " w-32"} type="date" value={usersFrom} onChange={(e) => setUsersFrom(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Do:</span>
                <input className={staffInputClass + " w-32"} type="date" value={usersTo} onChange={(e) => setUsersTo(e.target.value)} />
              </div>
              <span className="text-xs text-[var(--text-muted)]">Obuhvaćeno dana: {usersLength}</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-primary)] px-2.5 py-1.5 text-sm font-medium text-[var(--text-primary)]">
              <Infinity size={14} />
              Ceo period
            </span>
          )}
          <div className="hidden sm:block h-6 w-px bg-[var(--card-border)]" />
          <button
            type="button"
            onClick={() => setUsersAllTime((v) => !v)}
            className="rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)] whitespace-nowrap"
          >
            {usersAllTime ? "Izaberi period" : "Generalno"}
          </button>
        </div>
      </StaffCard>

      {!usersData ? (
        <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
      ) : (
        <>
          {/* User type cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600"><Users size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ukupno korisnika</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{usersData.totalUsers}</p>
                  {!usersAllTime && usersData.newUsersInPeriod > 0 && (
                    <p className="text-[10px] font-semibold text-blue-600">{usersData.newUsersInPeriod} novih u ovom periodu</p>
                  )}
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600"><GraduationCap size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Studenata</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{usersData.totalStudents}</p>
                  {!usersAllTime && usersData.newStudentsInPeriod > 0 && (
                    <p className="text-[10px] font-semibold text-emerald-600">{usersData.newStudentsInPeriod} novih u ovom periodu</p>
                  )}
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600"><School size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Učenika</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{usersData.totalHighSchoolers}</p>
                  {!usersAllTime && usersData.newHighSchoolersInPeriod > 0 && (
                    <p className="text-[10px] font-semibold text-amber-600">{usersData.newHighSchoolersInPeriod} novih u ovom periodu</p>
                  )}
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500"><Building2 size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ostalo (osoblje)</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{usersData.totalOther}</p>
                </div>
              </div>
            </StaffCard>
          </div>

          {/* Active users + new reservations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600"><UserCheck size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Aktivnih korisnika{!usersAllTime ? " (u periodu)" : ""}</p>
                  <p className="text-xl font-bold text-emerald-600">{usersData.activeUsers}</p>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${usersData.totalUsers > 0 ? (usersData.activeUsers / usersData.totalUsers) * 100 : 0}%` }} />
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600"><CalendarCheck size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Novih rezervacija{!usersAllTime ? " (u periodu)" : ""}</p>
                  <p className="text-xl font-bold text-blue-600">{usersData.newReservations}</p>
                </div>
              </div>
              {!usersAllTime && usersLength > 0 && (
                <p className="text-xs text-[var(--text-muted)]">~{(usersData.newReservations / usersLength).toFixed(1)} dnevno</p>
              )}
            </StaffCard>
          </div>

          {/* Religion & Fasting cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600"><UtensilsCrossed size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Poste sredu/petak</p>
                  <p className="text-xl font-bold text-amber-600">{usersData.fastingWedFri}</p>
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600"><Cross size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Poste veliki post</p>
                  <p className={`text-xl font-bold ${usersData.fastingGreatLent !== null ? "text-purple-600" : "text-[var(--text-muted)]"}`}>{usersData.fastingGreatLent !== null ? usersData.fastingGreatLent : "—"}</p>
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600"><Moon size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Vere: Islam</p>
                  <p className="text-xl font-bold text-emerald-600">{usersData.religionIslam}</p>
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600"><Cross size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Vere: Hrišćanstvo</p>
                  <p className="text-xl font-bold text-blue-600">{usersData.religionChristianity}</p>
                </div>
              </div>
            </StaffCard>
            <StaffCard padding="md">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-500"><HelpCircle size={18} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nisu se izjasnili</p>
                  <p className="text-xl font-bold text-gray-500">{usersData.religionNone}</p>
                </div>
              </div>
            </StaffCard>
          </div>

          {/* Reservations by faculty */}
          <SectionCard title="Rezervacije po fakultetu/školi">
            {usersData.reservationsByFaculty.length > 0 ? (
              <div className="space-y-2">
                {usersData.reservationsByFaculty.map((item) => {
                  const maxCount = Math.max(...usersData.reservationsByFaculty.map((r) => r.count));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.faculty} className="flex items-center gap-3">
                      <span className="text-sm text-[var(--text-primary)] min-w-[200px] font-medium">{item.faculty}</span>
                      <div className="flex-1 h-4 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 85 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : pct >= 30 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-[var(--text-primary)] font-semibold min-w-[40px] text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">Nema rezervacija u izabranom periodu.</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
