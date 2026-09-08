"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  X,
  Users,
  Search,
} from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { fetchActivityLogs } from "@/lib/backend/activity-logs-api";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { shouldUseAdminApi, updateStaffRoleViaApi, resetStaffPasswordViaApi } from "@/lib/backend/admin-api";
import type { ActivityLogEntry } from "@/server/repositories/activity-logs";
import {
  addStaffMember,
  deleteStaffMember,
  generatePassword,
  updateStaffMember,
  updateStaffMemberPassword,
  publishNotice,
} from "@/lib/admin-system-store";
import {
  EMPLOYEE_ROLE_LABELS,
  relativeTime,
  type EmployeeRole,
  type StaffMember,
  type NoticeTarget,
} from "@/lib/admin-system-mock";
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
import {
  StaffCreateSuccessModal,
  StaffDeleteConfirmModal,
  StaffResetPasswordModal,
  StaffSuspendModal,
  StaffRoleChangeModal,
  StaffNoticeModal,
  StaffActionsPopup,
} from "./staff-modals";

type ActiveTab = "lista" | "kreiraj";

export function AdminStaffPage() {
  const { state, refresh } = useAdminSystem({ scope: "full" });
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("lista");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EmployeeRole>("referent");
  const [creating, setCreating] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<{
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [logsTarget, setLogsTarget] = useState<{
    member: (typeof state.staff)[number];
  } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{
    member: (typeof state.staff)[number];
    password: string;
  } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{
    member: (typeof state.staff)[number];
    action: "suspend" | "activate";
  } | null>(null);
  const [roleTarget, setRoleTarget] = useState<{
    member: (typeof state.staff)[number];
  } | null>(null);
  const [noticeTarget, setNoticeTarget] = useState<{
    member: (typeof state.staff)[number];
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | null>(null);
  const [sortCreatedAt, setSortCreatedAt] = useState<"asc" | "desc" | null>(null);
  const roleBadgeClass = (role: EmployeeRole) => {
    switch (role) {
      case "admin":
        return "rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700";
      case "referent":
        return "rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700";
      case "kuvar":
        return "rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700";
      case "salter":
        return "rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800";
      case "moderator":
        return "rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600";
      default:
        return "rounded-full bg-[#5055D2]/10 px-2.5 py-0.5 text-xs font-semibold text-[#5055D2]";
    }
  };
  const activeCount = useMemo(() => state.staff.filter((m) => {
    if (!m.active || !m.lastLoginAt) return false;
    return !m.lastLogoutAt || m.lastLoginAt >= m.lastLogoutAt;
  }).length, [state.staff]);

  const handleExportCsv = useCallback(() => {
    const header = "Ime,Email,Uloga,Status,Kreiran";
    const rows = state.staff.map((m) => {
      const status = !m.active ? "Suspendovan" : (m.lastLoginAt && (!m.lastLogoutAt || m.lastLoginAt >= m.lastLogoutAt)) ? "Aktivan" : "Neaktivan";
      return `"${m.name}","${m.email}","${EMPLOYEE_ROLE_LABELS[m.role] ?? m.role}","${status}","${new Date(m.createdAt).toLocaleDateString("sr-RS")}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaposleni_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.staff]);
  const filteredStaff = useMemo(() => {
    let result = state.staff.filter((m) => {
      if (searchQuery.trim() && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (roleFilter && m.role !== roleFilter) return false;
      return true;
    });
    if (sortCreatedAt) {
      result = [...result].sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return sortCreatedAt === "asc" ? da - db : db - da;
      });
    }
    return result;
  }, [state.staff, searchQuery, roleFilter, sortCreatedAt]);
  const kpi = useMemo(() => {
    const total = state.staff.length;
    const admini = state.staff.filter((m) => m.role === "admin").length;
    const referenti = state.staff.filter((m) => m.role === "referent").length;
    const moderatori = state.staff.filter((m) => m.role === "moderator").length;
    const kuvari = state.staff.filter((m) => m.role === "kuvar").length;
    const operateri = state.staff.filter((m) => m.role === "salter").length;
    return { total, admini, referenti, moderatori, kuvari, operateri };
  }, [state.staff]);
  const [actionTarget, setActionTarget] = useState<{
    member: (typeof state.staff)[number];
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Ime i email su obavezna polja.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Email nije u ispravnoj formi.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = state.staff.some(
      (m) => m.email.toLowerCase() === normalizedEmail,
    );
    if (emailExists) {
      toast.error("Korisnik sa ovom email adresom već postoji.");
      return;
    }

    setCreating(true);
    try {
      const generatedPassword = generatePassword();
      const member = await addStaffMember({
        name: name.trim(),
        email: normalizedEmail,
        role,
        password: generatedPassword,
      });
      setCreatedEmployee({ email: member.email.toLowerCase(), password: member.demoPassword ?? generatedPassword, role: member.role });
      setName("");
      setEmail("");
      setRole("referent");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kreiranje naloga nije uspelo.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStaffMember(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
    toast.success("Nalog je obrisan.");
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    const newPassword = generatePassword();
    const member = passwordTarget.member;
    updateStaffMemberPassword(member.email, newPassword);
    if (member.supabaseUserId && shouldUseAdminApi()) {
      try {
        await resetStaffPasswordViaApi(member.supabaseUserId, newPassword);
      } catch (err) {
        console.error("[ResetPassword] API error:", err);
        toast.error("Lozinka je sačuvana lokalno, ali nije ažurirana u bazi.");
      }
    }
    setPasswordTarget({ ...passwordTarget, password: newPassword });
    toast.success("Nova lozinka je generisana.");
  };

  const handleSuspendToggle = async (reason: string) => {
    if (!suspendTarget) return;
    if (suspendTarget.action === "suspend") {
      updateStaffMember(suspendTarget.member.id, {
        active: false,
        suspendedReason: reason.trim() || undefined,
      });
    } else {
      updateStaffMember(suspendTarget.member.id, {
        active: true,
        suspendedReason: undefined,
      });
    }
    toast.success(
      suspendTarget.action === "activate"
        ? "Nalog je aktiviran."
        : "Nalog je suspendovan.",
    );
    setSuspendTarget(null);
    refresh();
  };

  const handleChangeRole = async (newRole: EmployeeRole) => {
    if (!roleTarget) return;
    updateStaffMember(roleTarget.member.id, { role: newRole });
    const member = roleTarget.member;
    if (member.supabaseUserId && shouldUseAdminApi()) {
      try {
        await updateStaffRoleViaApi(member.supabaseUserId, newRole);
      } catch (err) {
        console.error("[ChangeRole] API error:", err);
      }
    }
    toast.success("Uloga je izmenjena.");
    setRoleTarget(null);
    refresh();
  };

  const handleSendNotice = async (data: { title: string; message: string; priority: "info" | "important"; displayMode: "standard" | "popup" }) => {
    if (!noticeTarget) return;
    const member = noticeTarget.member;
    const roleToTarget: Record<string, NoticeTarget> = {
      admin: "admin",
      referent: "referent",
      kuvar: "kitchen",
      salter: "kitchen",
      moderator: "kitchen",
    };
    const targets: NoticeTarget[] = [roleToTarget[member.role] ?? "admin"];
    await publishNotice({
      title: data.title,
      message: data.message,
      priority: data.priority,
      targets,
      targetEmail: member.email,
      displayMode: data.displayMode,
    });
    toast.success("Obaveštenje je poslato.");
    setNoticeTarget(null);
  };

  const roleOptions = (Object.entries(EMPLOYEE_ROLE_LABELS) as [EmployeeRole, string][]).map(
    ([id, label]) => ({ id, label }),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <StaffSegmentedControl
          options={[
            { id: "lista" as const, label: "Lista zaposlenih" },
            { id: "kreiraj" as const, label: "Kreiraj nalog zaposlenom" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {activeCount} aktivnih
          </span>
          <button
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.03]"
            onClick={handleExportCsv}
            type="button"
          >
            Generiši CSV podatke o zaposlenima
          </button>
        </div>
      </div>

      {activeTab === "kreiraj" && (
        <StaffCard title="Kreiraj nalog zaposlenom">
          <div className="mt-4 space-y-4">
            <div>
              <label className={staffLabelClass}>Ime i prezime</label>
              <input
                className={staffInputClass}
                onChange={(e) => setName(e.target.value)}
                placeholder="Npr. Ana Janković"
                value={name}
              />
            </div>
            <div>
              <label className={staffLabelClass}>Email</label>
              <input
                className={staffInputClass}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana.jankovic@emenza.rs"
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className={staffLabelClass}>Uloga</label>
              <select
                className={staffInputClass}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                value={role}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={staffButtonPrimaryClass}
              disabled={creating || !name.trim() || !email.trim()}
              onClick={handleCreate}
              type="button"
            >
              {creating ? "Kreiranje..." : "Napravi nalog"}
            </button>
          </div>
        </StaffCard>
      )}

      {activeTab === "lista" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-0 flex-[2] items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white px-3 py-3 shadow-[var(--shadow-sm)]">
              <Search size={15} className="text-[var(--text-muted)] shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
                placeholder="Pretraži zaposlene..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-1 items-center gap-4 rounded-xl border border-[var(--card-border)] bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
              <button
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${!roleFilter ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(null)}
                type="button"
              >
                <Users size={14} />
                {kpi.total}
              </button>
              <div className="h-5 w-px bg-[var(--card-border)]" />
              <button
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${roleFilter === "admin" ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(roleFilter === "admin" ? null : "admin")}
                type="button"
              >
                {kpi.admini} admini
              </button>
              <button
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${roleFilter === "referent" ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(roleFilter === "referent" ? null : "referent")}
                type="button"
              >
                {kpi.referenti} referenti
              </button>
              <button
                className={`hidden rounded-lg px-2 py-1 text-xs font-semibold transition-colors sm:inline ${roleFilter === "moderator" ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(roleFilter === "moderator" ? null : "moderator")}
                type="button"
              >
                {kpi.moderatori} moderatori
              </button>
              <button
                className={`hidden rounded-lg px-2 py-1 text-xs font-semibold transition-colors md:inline ${roleFilter === "kuvar" ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(roleFilter === "kuvar" ? null : "kuvar")}
                type="button"
              >
                {kpi.kuvari} kuvari
              </button>
              <button
                className={`hidden rounded-lg px-2 py-1 text-xs font-semibold transition-colors lg:inline ${roleFilter === "salter" ? "bg-[#5055D2] text-white shadow-sm" : "text-[var(--text-secondary)] hover:bg-black/[0.03]"}`}
                onClick={() => setRoleFilter(roleFilter === "salter" ? null : "salter")}
                type="button"
              >
                {kpi.operateri} operateri
              </button>
            </div>
          </div>
          <StaffTable>
          <StaffTableHead>
            <tr>
              <th className="px-5 py-3">Ime</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Uloga</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => setSortCreatedAt(sortCreatedAt === "asc" ? "desc" : sortCreatedAt === "desc" ? null : "asc")}
                  type="button"
                >
                  Kreiran
                  {sortCreatedAt === "asc" ? " ▲" : sortCreatedAt === "desc" ? " ▼" : ""}
                </button>
              </th>
              <th className="px-5 py-3" />
            </tr>
          </StaffTableHead>
          <StaffTableBody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]" colSpan={6}>
                  {searchQuery.trim() ? "Nema rezultata pretrage." : "Nema zaposlenih."}
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => (
                <tr className="border-t staff-table-row" key={member.id}>
                  <td className="px-5 py-3 font-medium">{member.name}</td>
                  <td className="px-5 py-3 text-xs">{member.email}</td>
                  <td className="px-5 py-3">
                    <span className={roleBadgeClass(member.role)}>
                      {EMPLOYEE_ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      if (!member.active) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Suspendovan
                          </span>
                        );
                      }
                      const isActive = member.lastLoginAt && (!member.lastLogoutAt || member.lastLoginAt >= member.lastLogoutAt);
                      if (isActive) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Aktivan
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                          Neaktivan
                          {member.lastLogoutAt ? (
                            <span className="text-[var(--text-tertiary)]">· {relativeTime(member.lastLogoutAt)}</span>
                          ) : member.lastLoginAt ? (
                            <span className="text-[var(--text-tertiary)]">· {relativeTime(member.lastLoginAt)}</span>
                          ) : null}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-tertiary)]">
                    {new Date(member.createdAt).toLocaleDateString("sr-RS")}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10"
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const right = window.innerWidth - rect.right;
                        setActionTarget(
                          actionTarget?.member.id === member.id
                            ? null
                            : { member, right, ...(spaceBelow >= 200 ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }) },
                        );
                      }}
                      type="button"
                    >
                      Akcije
                      <ChevronDown size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </StaffTableBody>
        </StaffTable>
      </>)}

      {createdEmployee && (
        <StaffCreateSuccessModal
          data={createdEmployee}
          onClose={() => setCreatedEmployee(null)}
        />
      )}

      {logsTarget && (
        <EmployeeLogsModal
          backend={isClientBackendEnabled()}
          member={logsTarget.member}
          onClose={() => setLogsTarget(null)}
        />
      )}

      {passwordTarget && (
        <StaffResetPasswordModal
          target={passwordTarget}
          onReset={handleResetPassword}
          onClose={() => setPasswordTarget(null)}
        />
      )}

      {suspendTarget && (
        <StaffSuspendModal
          target={suspendTarget}
          onConfirm={handleSuspendToggle}
          onCancel={() => setSuspendTarget(null)}
        />
      )}

      {roleTarget && (
        <StaffRoleChangeModal
          target={roleTarget}
          onConfirm={handleChangeRole}
          onCancel={() => setRoleTarget(null)}
        />
      )}

      {noticeTarget && (
        <StaffNoticeModal
          target={noticeTarget}
          onSend={handleSendNotice}
          onCancel={() => setNoticeTarget(null)}
        />
      )}

      {deleteTarget && (
        <StaffDeleteConfirmModal
          target={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {actionTarget && (
        <StaffActionsPopup
          member={actionTarget.member}
          position={{ top: actionTarget.top, bottom: actionTarget.bottom, right: actionTarget.right }}
          onClose={() => setActionTarget(null)}
          onLogs={() => setLogsTarget({ member: actionTarget.member })}
          onResetPassword={() => setPasswordTarget({ member: actionTarget.member, password: "" })}
          onChangeRole={() => setRoleTarget({ member: actionTarget.member })}
          onSuspendToggle={() => setSuspendTarget({ member: actionTarget.member, action: actionTarget.member.active ? "suspend" : "activate" })}
          onSendNotice={() => setNoticeTarget({ member: actionTarget.member })}
          onDelete={() => setDeleteTarget({ id: actionTarget.member.id, name: actionTarget.member.name })}
        />
      )}
    </div>
  );
}

export default AdminStaffPage;

type EmployeeLogsModalProps = {
  backend: boolean;
  member: StaffMember;
  onClose: () => void;
};

function EmployeeLogsModal({ backend, member, onClose }: EmployeeLogsModalProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState<string | "all">("all");

  const fetchLogs = useCallback(async (from: string, to: string, action: string) => {
    setLoading(true);
    try {
      const result = await fetchActivityLogs({
        userId: member.supabaseUserId || undefined,
        from: from || undefined,
        to: to || undefined,
        actionType: action === "all" ? undefined : action,
        pageSize: 100,
      });
      setLogs(result.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [member.supabaseUserId]);

  useEffect(() => {
    if (backend) {
      fetchLogs(dateFrom, dateTo, actionFilter);
    }
  }, [backend, member.supabaseUserId, fetchLogs, dateFrom, dateTo, actionFilter]);

  const hasApiAccess = backend;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>

        <div className="mb-5">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Logovi — {member.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">{member.email}</p>
          {!member.supabaseUserId && (
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Prikazuju se svi logovi (korisnik nije povezan sa bazom).
            </p>
          )}
        </div>

        {hasApiAccess ? (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Od
                </label>
                <input
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Do
                </label>
                <input
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <button
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.02]"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                type="button"
              >
                Resetuj filter
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "login", "logout"] as const).map((opt) => (
                <button
                  key={opt}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    actionFilter === opt
                      ? "bg-[#5055D2] text-white"
                      : "bg-black/[0.05] text-[var(--text-secondary)] hover:bg-black/[0.08]"
                  }`}
                  onClick={() => setActionFilter(opt)}
                  type="button"
                >
                  {opt === "all" ? "Sve" : opt === "login" ? "Prijava" : "Odjava"}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Učitavanje...</p>
              ) : logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">Nema logova za prikazani period.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.06] text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      <th className="pb-2 pr-4">Datum</th>
                      <th className="pb-2 pr-4">Tip</th>
                      <th className="pb-2">Opis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-black/[0.03] last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-[var(--text-secondary)]">
                          {new Date(log.createdAt).toLocaleString("sr-RS")}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.actionType === "login" ? "bg-green-100 text-green-700" :
                            log.actionType === "logout" ? "bg-red-100 text-red-700" :
                            "bg-black/[0.05]"
                          }`}>
                            {log.actionType === "login" ? "Prijava" : log.actionType === "logout" ? "Odjava" : log.actionType}
                          </span>
                        </td>
                        <td className="py-2 text-[var(--text-primary)]">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
            Logovi nisu dostupni jer baza podataka nije povezana.
          </p>
        )}
      </div>
    </div>
  );
}
