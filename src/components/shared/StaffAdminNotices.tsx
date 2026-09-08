"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Check, Info, Shield, X } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { StaffCard, StaffEmptyState } from "@/components/staff";
import {
  getReadNotificationIds,
  markNotificationRead,
} from "@/lib/notification-read-state";
import type { ReferentAdminNotice } from "@/lib/referent-notifications-mock";

type StaffAdminNoticesProps = {
  notices: ReferentAdminNotice[];
  guestKey: string;
};

export function StaffAdminNotices({ notices: allNotices, guestKey }: StaffAdminNoticesProps) {
  useAdminSystem();
  const userKey = guestKey;
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds(userKey));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadNotificationIds(userKey));
  }, [userKey]);

  const popupNotices = useMemo(
    () => allNotices.filter((n) => n.displayMode === "popup" && !readIds.has(n.id)),
    [allNotices, readIds],
  );

  const visiblePopup = useMemo(
    () => popupNotices.find((n) => !dismissedIds.has(n.id)) ?? null,
    [popupNotices, dismissedIds],
  );

  const handleDismiss = useCallback((noticeId: string) => {
    setDismissedIds((prev) => new Set([...prev, noticeId]));
    markNotificationRead(userKey, noticeId);
    setReadIds((prev) => new Set([...prev, noticeId]));
  }, [userKey]);

  return (
    <>
      {visiblePopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 backdrop-blur-sm pt-[10vh] sm:items-center sm:pt-0 p-4">
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
              <div className={`relative px-6 pt-6 pb-4 ${visiblePopup.priority === "important" ? "bg-gradient-to-b from-amber-50 to-white" : "bg-gradient-to-b from-[#5055D2]/5 to-white"}`}>
                <button
                  className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
                  onClick={() => handleDismiss(visiblePopup.id)}
                  type="button"
                  aria-label="Zatvori"
                >
                  <X size={16} />
                </button>
                <div className="flex items-start gap-4">
                  <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${
                    visiblePopup.priority === "important"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-[#5055D2]/10 text-[#5055D2]"
                  }`}>
                    {visiblePopup.priority === "important"
                      ? <AlertTriangle size={26} />
                      : <Bell size={26} />
                    }
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <h2 className="text-base font-bold leading-tight text-[var(--text-primary)]">
                      {visiblePopup.priority === "important" ? (
                        <span className="text-amber-800">{visiblePopup.title}</span>
                      ) : (
                        visiblePopup.title
                      )}
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{visiblePopup.time}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                  {visiblePopup.message}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-black/[0.06] px-6 py-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {visiblePopup.priority === "important" ? (
                    <><AlertTriangle size={12} className="text-amber-500" /> Važno obaveštenje</>
                  ) : (
                    <><Info size={12} /> Informacija</>
                  )}
                  {visiblePopup.isInternal && (
                    <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                      Interno
                    </span>
                  )}
                </span>
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5055D2] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#3e42b3] active:scale-[0.97]"
                  onClick={() => handleDismiss(visiblePopup.id)}
                  type="button"
                >
                  <Check size={15} />
                  Razumem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {allNotices.length === 0 ? (
        <StaffEmptyState
          title="Nema obaveštenja"
          description="Trenutno nema objava od administracije."
          icon={<Shield aria-hidden size={18} className="text-[var(--brand-primary)]" />}
        />
      ) : (
        <StaffCard title="Obaveštenja administracije" padding="md">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
              <Shield aria-hidden="true" className="text-[var(--brand-primary)]" size={18} />
            </div>
          </div>
          <ul className="space-y-3">
            {allNotices.map((notice) => (
              <li key={notice.id}>
                <StaffCard
                  padding="sm"
                  className={notice.priority === "important" ? "border-amber-200 bg-amber-50/60" : ""}
                  title={
                    <span className="inline-flex items-center gap-2">
                      {notice.priority === "important" ? (
                        <AlertTriangle aria-hidden="true" className="shrink-0 text-amber-600" size={16} />
                      ) : (
                        <Info aria-hidden="true" className="shrink-0 text-[var(--text-muted)]" size={16} />
                      )}
                      {notice.title}
                    </span>
                  }
                  actions={
                    <div className="flex items-center gap-2">
                      {notice.displayMode === "popup" && (
                        <span className="rounded-md bg-[#5055D2]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#5055D2]">
                          Pop-up
                        </span>
                      )}
                      {notice.isInternal && (
                        <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                          Interno
                        </span>
                      )}
                      <time className="text-xs text-[var(--text-muted)]">{notice.time}</time>
                    </div>
                  }
                >
                  <div className="mt-1 text-sm font-light leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                    {notice.message}
                  </div>
                </StaffCard>
              </li>
            ))}
          </ul>
        </StaffCard>
      )}
    </>
  );
}

export default StaffAdminNotices;
