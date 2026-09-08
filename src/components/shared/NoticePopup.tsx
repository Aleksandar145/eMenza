"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Check, Info, X } from "lucide-react";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useStudentSession } from "@/hooks/useStudentSession";
import { getPublishedStudentNotices } from "@/lib/admin-system-store";
import { markNoticeReadViaApi, shouldUseAdminApi } from "@/lib/backend/admin-api";
import {
  getReadNotificationIds,
  markNotificationRead,
} from "@/lib/notification-read-state";

export function NoticePopup() {
  const { session } = useStudentSession();
  const { state } = useAdminSystem({ scope: "full" });

  const userKey = session?.userId ?? "guest";
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds(userKey));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadNotificationIds(userKey));
  }, [userKey]);

  const popupNotices = useMemo(() => {
    return getPublishedStudentNotices().filter(
      (n) => n.displayMode === "popup" && !n.read && !readIds.has(n.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.publishedNotices, readIds]);

  const visible = useMemo(
    () => popupNotices.find((n) => !dismissedIds.has(n.id)) ?? null,
    [popupNotices, dismissedIds],
  );

  const handleDismiss = useCallback(async (noticeId: string) => {
    setDismissedIds((prev) => new Set([...prev, noticeId]));
    markNotificationRead(userKey, noticeId);
    setReadIds((prev) => new Set([...prev, noticeId]));
    if (shouldUseAdminApi()) {
      try { await markNoticeReadViaApi(noticeId); } catch { /* silently fail */ }
    }
  }, [userKey]);

  if (!visible) return null;

  const isImportant = visible.priority === "important";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 backdrop-blur-sm pt-[10vh] sm:items-center sm:pt-0 p-4">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          {/* Header with icon */}
          <div className={`relative px-6 pt-6 pb-4 ${isImportant ? "bg-gradient-to-b from-amber-50 to-white" : "bg-gradient-to-b from-[#5055D2]/5 to-white"}`}>
            <button
              className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
              onClick={() => void handleDismiss(visible.id)}
              type="button"
              aria-label="Zatvori"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4">
              <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${
                isImportant
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[#5055D2]/10 text-[#5055D2]"
              }`}>
                {isImportant
                  ? <AlertTriangle size={26} />
                  : <Bell size={26} />
                }
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h2 className="text-base font-bold leading-tight text-[var(--text-primary)]">
                  {isImportant ? (
                    <span className="text-amber-800">{visible.title}</span>
                  ) : (
                    visible.title
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{visible.time}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <div
              className="text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-[#5055D2] [&_a]:font-semibold [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: visible.message }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-black/[0.06] px-6 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {isImportant ? (
                <><AlertTriangle size={12} className="text-amber-500" /> Važno obaveštenje</>
              ) : (
                <><Info size={12} /> Informacija</>
              )}
            </span>
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5055D2] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#3e42b3] active:scale-[0.97]"
              onClick={() => void handleDismiss(visible.id)}
              type="button"
            >
              <Check size={15} />
              Razumem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
