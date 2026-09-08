"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Search, ShieldCheck, Users, UserX } from "lucide-react";
import { useKuhinjaSessionContext } from "@/components/kuhinja/KuhinjaSessionProvider";
import {
  StaffBadge,
  StaffCard,
  StaffConfirmDialog,
  StaffTable,
  StaffTableBody,
  StaffTableHead,
  staffInputClass,
} from "@/components/staff";
import { StaffStatCard } from "@/components/staff/StaffStatCard";
import { useToast } from "@/components/shared/toast/useToast";
import type { KitchenStaffProfile } from "@/app/api/kitchen/staff/route";
import { useKitchenStaff } from "@/hooks/useKitchenStaff";
import {
  kitchenRoleLabels,
  normalizeKitchenStaffRole,
  type KitchenStaffRole,
} from "@/lib/kuhinja-roles";
import type { KitchenEmployeeRole } from "@/lib/kuhinja-staff-store";
import { updateKitchenEmployeeRole } from "@/lib/kuhinja-staff-store";
import {
  fetchKitchenStaffFromApi,
  shouldUseKitchenStaffApi,
  updateKitchenStaffRoleFromApi,
  updateKitchenStaffStatusFromApi,
} from "@/lib/backend/kitchen-staff-api";

const assignableRoles: KitchenEmployeeRole[] = ["kuvar", "salter"];

const roleFilterOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "Sve uloge" },
  { value: "kuvar", label: "Kuvar" },
  { value: "salter", label: "Operater šaltera" },
  { value: "moderator", label: "Moderator" },
];

const statusFilterOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "Svi statusi" },
  { value: "active", label: "Aktivni" },
  { value: "suspended", label: "Suspendovani" },
];

const avatarRoleClasses: Record<string, string> = {
  admin: "bg-[#5055D2]",
  moderator: "bg-indigo-400",
  referent: "bg-slate-400",
  kuvar: "bg-emerald-500",
  salter: "bg-amber-500",
};

type ConfirmTarget = {
  userId: string;
  name: string;
  action: "suspend" | "activate";
  reason?: string;
};

type RoleTarget = {
  userId: string;
  name: string;
  newRole: KitchenEmployeeRole;
  currentRole: KitchenStaffRole;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function roleColorKey(staff: KitchenStaffProfile): string {
  if (staff.role === "admin") return "admin";
  if (staff.role === "kitchen") {
    return staff.kitchenRole ?? "kuvar";
  }
  return "referent";
}

function EmployeeAvatar({ name, roleKey }: { name: string; roleKey: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarRoleClasses[roleKey] ?? "bg-slate-400"}`}
    >
      {getInitials(name)}
    </span>
  );
}

export function KitchenStaffRolesPage() {
  const { session } = useKuhinjaSessionContext();
  const toast = useToast();
  const isDbMode = shouldUseKitchenStaffApi();

  const [dbStaff, setDbStaff] = useState<KitchenStaffProfile[] | null>(null);
  const [loading, setLoading] = useState(isDbMode);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [roleTarget, setRoleTarget] = useState<RoleTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const { employees, refresh } = useKitchenStaff();

  const refreshDb = useCallback(async () => {
    if (!shouldUseKitchenStaffApi()) return;
    setLoading(true);
    setError(null);
    try {
      const staff = await fetchKitchenStaffFromApi();
      setDbStaff(staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri učitavanju zaposlenih.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDbMode) {
      const raf = requestAnimationFrame(() => void refreshDb());
      return () => cancelAnimationFrame(raf);
    }
  }, [isDbMode, refreshDb]);

  const isSelfId = useCallback(
    (userId: string) => {
      const selfEmail = session?.email?.toLowerCase();
      if (!selfEmail) return false;
      const staff = (dbStaff ?? []).find((s) => s.id === userId);
      return Boolean(staff && staff.email.toLowerCase() === selfEmail);
    },
    [session, dbStaff],
  );

  const protectReason = useCallback(
    (staff: KitchenStaffProfile): string | null => {
      if (staff.role === "admin") return "Administrator";
      if (staff.role === "kitchen" && staff.kitchenRole === "moderator") return "Moderator";
      return null;
    },
    [],
  );

  const filtered = useMemo(() => {
    const list = isDbMode ? (dbStaff ?? []) : [];
    const q = query.trim().toLowerCase();
    return list.filter((staff) => {
      if (roleFilter !== "all") {
        const actual = staff.role === "kitchen" ? (staff.kitchenRole ?? "kuvar") : staff.role;
        if (actual !== roleFilter) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !staff.active) return false;
        if (statusFilter === "suspended" && staff.active) return false;
      }
      if (q) {
        const haystack = `${staff.displayName} ${staff.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [isDbMode, dbStaff, query, roleFilter, statusFilter]);

  const totalCount = dbStaff?.length ?? 0;
  const activeCount = dbStaff?.filter((s) => s.active).length ?? 0;
  const suspendedCount = Math.max(0, totalCount - activeCount);

  function handleRoleChange(userId: string, newRole: KitchenEmployeeRole) {
    const staff = (dbStaff ?? []).find((s) => s.id === userId);
    if (!staff) return;
    if (protectReason(staff)) return;
    if (isSelfId(userId)) return;
    const current = normalizeKitchenStaffRole(staff.kitchenRole) ?? "kuvar";

    setRoleTarget({ userId, name: staff.displayName, newRole, currentRole: current });
  }

  async function confirmRoleChange() {
    if (!roleTarget) return;
    setSaving(true);
    try {
      await updateKitchenStaffRoleFromApi(roleTarget.userId, roleTarget.newRole);
      await refreshDb();
      toast.success(`Uloga za "${roleTarget.name}" je promenjena.`);
      setRoleTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri promeni uloge.");
    } finally {
      setSaving(false);
    }
  }

  function requestStatusChange(staff: KitchenStaffProfile) {
    if (protectReason(staff)) return;
    if (isSelfId(staff.id)) return;
    setSuspendReason("");
    setConfirmTarget({
      userId: staff.id,
      name: staff.displayName,
      action: staff.active ? "suspend" : "activate",
    });
  }

  async function confirmStatusChange() {
    if (!confirmTarget) return;
    const isSuspend = confirmTarget.action === "suspend";
    setSaving(true);
    try {
      await updateKitchenStaffStatusFromApi(
        confirmTarget.userId,
        !isSuspend,
        isSuspend ? suspendReason || undefined : undefined,
      );
      await refreshDb();
      toast.success(
        isSuspend
          ? `"${confirmTarget.name}" je suspendovan(a).`
          : `"${confirmTarget.name}" je ponovo aktivan(a).`,
      );
      setConfirmTarget(null);
      setSuspendReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri promeni statusa.");
    } finally {
      setSaving(false);
    }
  }

  if (!isDbMode) {
    return (
      <LegacyRolesPage
        employees={employees}
        isSelf={isSelfFromSession(session)}
        onRefresh={refresh}
        onRoleChange={updateKitchenEmployeeRole}
      />
    );
  }

  if (loading && !dbStaff) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              className="staff-card h-[104px] animate-pulse p-5"
              key={i}
            />
          ))}
        </div>
        <div className="staff-card animate-pulse space-y-4 p-5">
          <div className="h-4 w-1/3 rounded bg-black/10" />
          <div className="h-10 w-full rounded-lg bg-black/10" />
          <div className="h-10 w-full rounded-lg bg-black/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaffStatCard
          icon={Users}
          label="Ukupno zaposlenih"
          value={totalCount > 0 ? String(totalCount) : "–"}
        />
        <StaffStatCard
          accent="success"
          icon={CheckCircle2}
          label="Aktivni"
          value={activeCount > 0 ? String(activeCount) : "–"}
        />
        <StaffStatCard
          accent={suspendedCount > 0 ? "warning" : "success"}
          icon={UserX}
          label="Suspendovani"
          value={String(suspendedCount)}
        />
      </div>

      <StaffCard
        actions={
          <button
            aria-label="Osveži listu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-black/5 disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void refreshDb()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={14} />
            Osveži
          </button>
        }
        description="Pretražite i filtrirajte zaposlene, menjajte uloge ili upravljajte suspenzijom."
        title="Lista zaposlenih"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              size={16}
            />
            <input
              className={`${staffInputClass} pl-9`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pretraži po imenu ili email-u…"
              type="text"
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtriraj po ulozi"
              className={`${staffInputClass} min-w-[170px]`}
              onChange={(event) => setRoleFilter(event.target.value)}
              value={roleFilter}
            >
              {roleFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtriraj po statusu"
              className={`${staffInputClass} min-w-[150px]`}
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" className="text-[#5055D2]" size={14} />
            Administratori i moderatori su zaštićeni od promena.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Suspendovani ne mogu da se prijave.
          </span>
        </div>
      </StaffCard>

      <StaffTable empty={filtered.length === 0} emptyTitle="Nema zaposlenih">
        <StaffTableHead>
          <tr>
            <th className="px-5 py-3">Zaposleni</th>
            <th className="px-5 py-3">Uloga</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Akcije</th>
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {filtered.map((staff) => {
            const protectedAs = protectReason(staff);
            const self = isSelfId(staff.id);
            const cannotEdit = Boolean(protectedAs) || self;
            const isModerator = staff.role === "kitchen" && staff.kitchenRole === "moderator";
            const displayRole =
              staff.role === "kitchen" ? staff.kitchenRole ?? "kuvar" : staff.role;
            const displayRoleLabel =
              staff.role === "kitchen"
                ? kitchenRoleLabels[normalizeKitchenStaffRole(displayRole) ?? "kuvar"]
                : displayRole === "admin"
                  ? "Administrator"
                  : "Referent";

            return (
              <tr className="border-t staff-table-row" key={staff.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={staff.displayName} roleKey={roleColorKey(staff)} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {staff.displayName}
                        </span>
                        {self ? (
                          <span className="rounded-md bg-[#5055D2]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#5055D2]">
                            Vi
                          </span>
                        ) : null}
                        {protectedAs ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <ShieldCheck aria-hidden="true" size={12} />
                            {protectedAs}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {staff.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {isModerator ? (
                    <StaffBadge label="Moderator" variant="accent" />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <StaffBadge
                        label={displayRoleLabel}
                        variant={displayRole === "kuvar" ? "success" : "warning"}
                      />
                      {staff.role === "kitchen" && !cannotEdit ? (
                        <select
                          aria-label={`Promeni ulogu za ${staff.displayName}`}
                          className={`${staffInputClass} min-w-[140px]`}
                          disabled={saving}
                          onChange={(event) =>
                            handleRoleChange(staff.id, event.target.value as KitchenEmployeeRole)
                          }
                          value={
                            displayRole === "kuvar" || displayRole === "salter"
                              ? displayRole
                              : "kuvar"
                          }
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {kitchenRoleLabels[role]}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {staff.active ? (
                    <StaffBadge label="Aktivan" variant="success" dot />
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <StaffBadge label="Suspendovan" variant="warning" dot />
                      {staff.suspendedReason ? (
                        <span className="max-w-[180px] truncate text-xs text-[var(--text-secondary)]">
                          {staff.suspendedReason}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {cannotEdit ? (
                    <span className="text-xs text-[var(--text-secondary)]">—</span>
                  ) : staff.active ? (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                      disabled={saving}
                      onClick={() => requestStatusChange(staff)}
                      type="button"
                    >
                      <UserX aria-hidden="true" size={14} />
                      Suspenduj
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:opacity-50"
                      disabled={saving}
                      onClick={() => requestStatusChange(staff)}
                      type="button"
                    >
                      <CheckCircle2 aria-hidden="true" size={14} />
                      Aktiviraj
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </StaffTableBody>
      </StaffTable>

      <StaffConfirmDialog
        confirmLabel="Promeni"
        message={
          roleTarget
            ? `Uloga zaposlenog "${roleTarget.name}" biće promenjena iz "${kitchenRoleLabels[roleTarget.currentRole]}" u "${kitchenRoleLabels[roleTarget.newRole]}". Nastaviti?`
            : ""
        }
        onCancel={() => setRoleTarget(null)}
        onConfirm={confirmRoleChange}
        open={roleTarget !== null}
        title="Promeniti ulogu?"
      />

      {confirmTarget ? (
        <SuspendDialog
          action={confirmTarget.action}
          busy={saving}
          name={confirmTarget.name}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={confirmStatusChange}
          onReasonChange={setSuspendReason}
          reason={suspendReason}
        />
      ) : null}
    </div>
  );
}

type SuspendDialogProps = {
  action: "suspend" | "activate";
  name: string;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function SuspendDialog({
  action,
  name,
  reason,
  busy,
  onReasonChange,
  onConfirm,
  onCancel,
}: SuspendDialogProps) {
  const isSuspend = action === "suspend";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {isSuspend ? `Suspendovati "${name}"?` : `Aktivisati "${name}"?`}
        </p>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {isSuspend
            ? "Suspendovani zaposleni neće moći da se prijavi na sistem."
            : "Aktivisani zaposleni ponovo dobija pristup sistemu."}
        </p>
        {isSuspend ? (
          <textarea
            className={`${staffInputClass} mt-4 min-h-[80px] w-full`}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Razlog za suspenziju (opciono)"
            value={reason}
          />
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            Otkaži
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              isSuspend ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            } ${busy ? "opacity-60" : ""}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {isSuspend ? "Suspenduj" : "Aktiviraj"}
          </button>
        </div>
      </div>
    </div>
  );
}

function isSelfFromSession(
  session: { id?: string; email?: string } | null,
): (email: string) => boolean {
  return (email: string) =>
    Boolean(session?.email && session.email.toLowerCase() === email.toLowerCase());
}

type LegacyRolesPageProps = {
  employees: Array<{ id: string; displayName: string; email: string; role: KitchenEmployeeRole }>;
  isSelf: (email: string) => boolean;
  onRoleChange: (id: string, role: KitchenEmployeeRole) => void;
  onRefresh: () => void;
};

function LegacyRolesPage({ employees, isSelf, onRoleChange, onRefresh }: LegacyRolesPageProps) {
  const [confirmTarget, setConfirmTarget] = useState<{
    employeeId: string;
    employeeName: string;
    newRole: KitchenEmployeeRole;
    currentRole: KitchenEmployeeRole;
  } | null>(null);

  function handleRoleChange(employeeId: string, newRole: KitchenEmployeeRole) {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee || isSelf(employee.email)) return;
    setConfirmTarget({
      employeeId,
      employeeName: employee.displayName,
      newRole,
      currentRole: employee.role,
    });
  }

  function confirmRoleChange() {
    if (!confirmTarget) return;
    onRoleChange(confirmTarget.employeeId, confirmTarget.newRole);
    onRefresh();
    setConfirmTarget(null);
  }

  return (
    <div className="space-y-5">
      <StaffCard
        description="Odredite da li je zaposleni kuvar ili operater šaltera. Promena važi pri sledećoj prijavi."
        title="Dodela uloga u kuhinji"
      />
      <StaffTable>
        <StaffTableHead>
          <tr>
            <th className="px-5 py-3">Ime</th>
            <th className="px-5 py-3">Email</th>
            <th className="px-5 py-3">Trenutna uloga</th>
            <th className="px-5 py-3 text-right">Promeni ulogu</th>
          </tr>
        </StaffTableHead>
        <StaffTableBody>
          {employees.map((employee) => {
            const cannotEdit = isSelf(employee.email);
            return (
              <tr className="border-t staff-table-row" key={employee.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar name={employee.displayName} roleKey={employee.role} />
                    <span className="font-medium text-[var(--text-primary)]">
                      {employee.displayName}
                      {cannotEdit ? (
                        <span className="ml-2 rounded-md bg-[#5055D2]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#5055D2]">
                          Vi
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-[var(--text-secondary)]">{employee.email}</td>
                <td className="px-5 py-3">
                  <StaffBadge
                    label={kitchenRoleLabels[employee.role]}
                    variant={employee.role === "kuvar" ? "success" : "warning"}
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  {cannotEdit ? (
                    <span className="text-xs text-[var(--text-secondary)]">—</span>
                  ) : (
                    <select
                      aria-label={`Uloga za ${employee.displayName}`}
                      className={`${staffInputClass} min-w-[180px]`}
                      onChange={(event) =>
                        handleRoleChange(employee.id, event.target.value as KitchenEmployeeRole)
                      }
                      value={employee.role}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {kitchenRoleLabels[role]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </StaffTableBody>
      </StaffTable>

      <StaffConfirmDialog
        confirmLabel="Promeni"
        message={
          confirmTarget
            ? `Uloga zaposlenog "${confirmTarget.employeeName}" biće promenjena iz "${kitchenRoleLabels[confirmTarget.currentRole]}" u "${kitchenRoleLabels[confirmTarget.newRole]}". Nastaviti?`
            : ""
        }
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmRoleChange}
        open={confirmTarget !== null}
        title="Promeniti ulogu?"
      />
    </div>
  );
}

export default KitchenStaffRolesPage;
