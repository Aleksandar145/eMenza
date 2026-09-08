"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  MessageSquareText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useAppTime, useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useReferentCards } from "@/hooks/useReferentCards";
import { useKuhinjaJelovnik } from "@/hooks/useKuhinjaJelovnik";
import { useDishCatalog } from "@/hooks/useDishCatalog";
import { getSystemAlerts, type SystemAlert } from "@/lib/admin-alerts";
import { formatFeedRelativeTime, getRecentActivity, type FeedItemKind } from "@/lib/admin-activity";
import { FEED_WINDOW_HOURS } from "@/lib/activity-feed-config";
import { AUDIT_WINDOW_HOURS } from "@/lib/audit-trail-config";
import { formatAuditRelativeTime, getAuditEntries, type AuditKind } from "@/lib/audit-trail";
import {
  hydrateAuditTrailFromStorage,
  loadAuditRecords,
  subscribeAuditTrail,
  type AdminAuditRecord,
} from "@/lib/audit-trail-store";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { apiFetch } from "@/lib/api/client";
import { loadKuhinjaJelovnikState } from "@/lib/kuhinja-jelovnik-store";
import type { DailyMenuEntry } from "@/lib/kuhinja-mock";
import { parseDateKey, addDays, toDateKey } from "@/lib/calendar-utils";

type LucideIcon = typeof Activity;

type PanelKind = "alerts" | "feed" | "audit" | null;

const FEED_ICONS: Record<FeedItemKind, LucideIcon> = {
  top_up: Coins,
  card_activation: CreditCard,
  complaint: ShieldAlert,
  feedback: MessageSquareText,
  menu: CalendarDays,
  dish: UtensilsCrossed,
};

const AUDIT_ICONS: Record<AuditKind, LucideIcon> = {
  notice: Shield,
  working_hours: Clock,
  reservation: CalendarDays,
  prices: Coins,
  staff: Users,
  reversal: ShieldCheck,
  card: Shield,
  other: Shield,
};

const FEED_ALERT_SEVERITY_CLASSES: Record<SystemAlert["severity"], string> = {
  critical: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
};

const AUDIT_ICON_CLASSES: Record<AuditKind, string> = {
  notice: "bg-[#5055D2]/10 text-[#5055D2]",
  working_hours: "bg-[#5055D2]/10 text-[#5055D2]",
  reservation: "bg-[#5055D2]/10 text-[#5055D2]",
  prices: "bg-[#5055D2]/10 text-[#5055D2]",
  staff: "bg-[#5055D2]/10 text-[#5055D2]",
  reversal: "bg-[#5055D2]/10 text-[#5055D2]",
  card: "bg-[#5055D2]/10 text-[#5055D2]",
  other: "bg-[#5055D2]/10 text-[#5055D2]",
};

const ALERTS_READ_IDS_KEY = "emenza-admin-alerts-read";
const FEED_LAST_SEEN_KEY = "emenza-activity-feed-last-seen";
const AUDIT_LAST_SEEN_KEY = "emenza-audit-trail-last-seen";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(ALERTS_READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function loadLastSeen(key: string): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function useAuditTrailRecords(): AdminAuditRecord[] {
  const [records, setRecords] = useState<AdminAuditRecord[]>(() => {
    hydrateAuditTrailFromStorage();
    return loadAuditRecords();
  });

  useEffect(() => {
    hydrateAuditTrailFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(loadAuditRecords());
    return subscribeAuditTrail(() => {
      setRecords(loadAuditRecords());
    });
  }, []);

  return records;
}

export function AdminTopBarActions() {
  const { now } = useAppTime();
  const todayDateKey = useTodayDateKey();
  const { state: referentState } = useReferentCards();
  const { state: systemState } = useAdminSystem({ scope: "full" });
  const { state: jelovnikState } = useKuhinjaJelovnik();
  const { state: dishState } = useDishCatalog();
  const auditRecords = useAuditTrailRecords();

  const [menus, setMenus] = useState<DailyMenuEntry[]>([]);
  const [openPanel, setOpenPanel] = useState<PanelKind>(null);
  const [alertsReadIds, setAlertsReadIds] = useState<Set<string>>(loadReadIds);
  const [feedLastSeen, setFeedLastSeen] = useState<number>(() => loadLastSeen(FEED_LAST_SEEN_KEY));
  const [auditLastSeen, setAuditLastSeen] = useState<number>(() => loadLastSeen(AUDIT_LAST_SEEN_KEY));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!todayDateKey) {
      return;
    }
    const anchor = parseDateKey(todayDateKey);
    if (!anchor) {
      return;
    }
    const from = todayDateKey;
    const to = toDateKey(addDays(anchor, 1));

    if (isClientBackendEnabled()) {
      apiFetch<{ menus: DailyMenuEntry[] }>(`/api/admin/menus?from=${from}&to=${to}`)
        .then((data) => setMenus(data.menus))
        .catch(() => setMenus(loadKuhinjaJelovnikState().menus));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMenus(loadKuhinjaJelovnikState().menus);
    }
  }, [todayDateKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ALERTS_READ_IDS_KEY, JSON.stringify([...alertsReadIds]));
    } catch {
      // ignore storage write errors
    }
  }, [alertsReadIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FEED_LAST_SEEN_KEY, String(feedLastSeen));
    } catch {
      // ignore storage write errors
    }
  }, [feedLastSeen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIT_LAST_SEEN_KEY, String(auditLastSeen));
    } catch {
      // ignore storage write errors
    }
  }, [auditLastSeen]);

  useEffect(() => {
    if (!openPanel) {
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPanel]);

  const alerts = useMemo(
    () =>
      getSystemAlerts({
        todayDateKey,
        menus,
        topUpLogs: referentState.actionLogs,
        complaints: systemState.complaintEntries,
        feedback: systemState.feedbackEntries,
        publishedNotices: systemState.publishedNotices,
      }),
    [todayDateKey, menus, referentState.actionLogs, systemState.complaintEntries, systemState.feedbackEntries, systemState.publishedNotices],
  );

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !alertsReadIds.has(alert.id)),
    [alerts, alertsReadIds],
  );

  const feedItems = useMemo(
    () =>
      getRecentActivity({
        now: now.getTime(),
        actionLogs: referentState.actionLogs,
        cards: referentState.cards,
        complaintEntries: systemState.complaintEntries,
        feedbackEntries: systemState.feedbackEntries,
        menus: jelovnikState.menus,
        dishes: dishState.dishes,
      }),
    [now, referentState.actionLogs, referentState.cards, systemState.complaintEntries, systemState.feedbackEntries, jelovnikState.menus, dishState.dishes],
  );

  const feedUnread = useMemo(
    () => feedItems.filter((item) => new Date(item.at).getTime() > feedLastSeen).length,
    [feedItems, feedLastSeen],
  );

  const auditItems = useMemo(
    () =>
      getAuditEntries({
        now: now.getTime(),
        records: auditRecords,
      }),
    [now, auditRecords],
  );

  const auditUnread = useMemo(
    () => auditItems.filter((item) => new Date(item.at).getTime() > auditLastSeen).length,
    [auditItems, auditLastSeen],
  );

  const markAllAlertsRead = useCallback(() => {
    setAlertsReadIds((prev) => {
      const next = new Set(prev);
      for (const alert of alerts) {
        next.add(alert.id);
      }
      return next;
    });
  }, [alerts]);

  const markAlertRead = useCallback((id: string) => {
    setAlertsReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const open = (panel: Exclude<PanelKind, null>) => {
    // Otvaranje panela označava njegove stavke kao pročitane.
    if (openPanel !== panel) {
      if (panel === "feed") {
        setFeedLastSeen(now.getTime());
      } else if (panel === "audit") {
        setAuditLastSeen(now.getTime());
      }
    }
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const menuOpen = openPanel !== null;

  const feedWindowLabel = Number(FEED_WINDOW_HOURS) === 24 ? "danas" : `poslednjeg ${FEED_WINDOW_HOURS}h`;
  const auditWindowLabel = Number(AUDIT_WINDOW_HOURS) === 24 ? "danas" : `poslednjeg ${AUDIT_WINDOW_HOURS}h`;

  const triggerBtn =
    "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]";

  return (
    <div className="relative" ref={containerRef}>
      <div
        aria-label="Akcije i izmene"
        className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--card-border)] bg-white p-0.5 shadow-[var(--shadow-sm)]"
      >
        <button
          aria-expanded={openPanel === "alerts"}
          aria-label={unreadAlerts.length > 0 ? `Hitne akcije (${unreadAlerts.length})` : "Hitne akcije"}
          className={triggerBtn}
          onClick={() => open("alerts")}
          title="Hitne akcije"
          type="button"
        >
          <AlertTriangle aria-hidden="true" size={17} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Hitne akcije</span>
          {unreadAlerts.length > 0 ? (
            <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 py-[3px] text-[11px] font-bold leading-none text-white tabular-nums">
              {unreadAlerts.length}
            </span>
          ) : null}
        </button>

        <span aria-hidden="true" className="h-6 w-px bg-[var(--card-border)]" />

        <button
          aria-expanded={openPanel === "feed"}
          aria-label={feedUnread > 0 ? `Najnovije akcije (${feedUnread})` : "Najnovije akcije"}
          className={triggerBtn}
          onClick={() => open("feed")}
          title="Najnovije akcije"
          type="button"
        >
          <Activity aria-hidden="true" size={17} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Najnovije akcije</span>
          {feedUnread > 0 ? (
            <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[#5055D2] px-1 py-[3px] text-[11px] font-bold leading-none text-white tabular-nums">
              {feedUnread}
            </span>
          ) : null}
        </button>

        <span aria-hidden="true" className="h-6 w-px bg-[var(--card-border)]" />

        <button
          aria-expanded={openPanel === "audit"}
          aria-label={auditUnread > 0 ? `Admin akcije (${auditUnread})` : "Admin akcije"}
          className={triggerBtn}
          onClick={() => open("audit")}
          title="Admin akcije"
          type="button"
        >
          <Shield aria-hidden="true" size={17} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Admin akcije</span>
          {auditUnread > 0 ? (
            <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 py-[3px] text-[11px] font-bold leading-none text-white tabular-nums">
              {auditUnread}
            </span>
          ) : null}
        </button>
      </div>

      {menuOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[24rem] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white shadow-xl">
          {openPanel === "alerts" ? (
            <AlertsPanel
              alerts={unreadAlerts}
              onClose={() => setOpenPanel(null)}
              onMarkAllRead={markAllAlertsRead}
              onMarkRead={markAlertRead}
            />
          ) : null}
          {openPanel === "feed" ? (
            <FeedPanel items={feedItems} now={now.getTime()} windowLabel={feedWindowLabel} onClose={() => setOpenPanel(null)} />
          ) : null}
          {openPanel === "audit" ? (
            <AuditPanel items={auditItems} now={now.getTime()} windowLabel={auditWindowLabel} onClose={() => setOpenPanel(null)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
      </div>
      <button
        aria-label="Zatvori"
        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function AlertsPanel({
  alerts,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: {
  alerts: SystemAlert[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Hitne akcije</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {alerts.length > 0 ? `${alerts.length} nepročitanih upozorenja` : "Nema nepročitanih upozorenja"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {alerts.length > 0 ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#5055D2] hover:bg-[var(--bg-muted)]"
              onClick={onMarkAllRead}
              type="button"
            >
              <Check aria-hidden="true" size={13} />
              Svi pročitani
            </button>
          ) : null}
          <button
            aria-label="Zatvori"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
          <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={28} />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Sve je pročitano</p>
          <p className="text-xs text-[var(--text-secondary)]">Nema nepročitanih upozorenja.</p>
        </div>
      ) : (
        <ul className="max-h-[24rem] overflow-y-auto custom-scrollbar">
          {alerts.map((alert) => (
            <li className="border-b border-[var(--card-border)] last:border-b-0" key={alert.id}>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${FEED_ALERT_SEVERITY_CLASSES[alert.severity]}`}>
                  <AlertTriangle aria-hidden="true" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{alert.message}</p>
                  <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5055D2] hover:underline" href={alert.href} onClick={onClose}>
                    {alert.actionLabel}
                    <ArrowUpRight aria-hidden="true" size={13} />
                  </Link>
                </div>
                <button
                  aria-label={`Označi kao pročitano: ${alert.title}`}
                  className="shrink-0 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-emerald-600"
                  onClick={() => onMarkRead(alert.id)}
                  title="Označi kao pročitano"
                  type="button"
                >
                  <Check aria-hidden="true" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FeedPanel({
  items,
  now,
  windowLabel,
  onClose,
}: {
  items: ReturnType<typeof getRecentActivity>;
  now: number;
  windowLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      <PanelHeader
        title="Najnovije akcije"
        subtitle={items.length > 0 ? `${items.length} aktivnosti ${windowLabel}` : `Nema aktivnosti ${windowLabel}`}
        onClose={onClose}
      />
      {items.length === 0 ? (
        <EmptyPanel icon={<Activity size={28} />} title="Nema aktivnosti" description="Nema zabeleženih dešavanja u izabranom periodu." />
      ) : (
        <ul className="max-h-[26rem] overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const Icon = FEED_ICONS[item.kind];
            return (
              <li className="border-b border-[var(--card-border)] last:border-b-0" key={item.id}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#5055D2]/10 text-[#5055D2]">
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-tertiary)]">{formatFeedRelativeTime(now, item.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                    <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5055D2] hover:underline" href={item.href} onClick={onClose}>
                      Otvori
                      <ArrowUpRight aria-hidden="true" size={13} />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function AuditPanel({
  items,
  now,
  windowLabel,
  onClose,
}: {
  items: ReturnType<typeof getAuditEntries>;
  now: number;
  windowLabel: string;
  onClose: () => void;
}) {
  return (
    <>
      <PanelHeader
        title="Admin akcije"
        subtitle={items.length > 0 ? `${items.length} izmena ${windowLabel}` : `Nema izmena ${windowLabel}`}
        onClose={onClose}
      />
      {items.length === 0 ? (
        <EmptyPanel icon={<Shield size={28} />} title="Nema izmena" description="Nema zabeleženih administratorskih izmena u izabranom periodu." />
      ) : (
        <ul className="max-h-[26rem] overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const Icon = AUDIT_ICONS[item.kind];
            return (
              <li className="border-b border-[var(--card-border)] last:border-b-0" key={item.id}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${AUDIT_ICON_CLASSES[item.kind]}`}>
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.author}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-tertiary)]">{formatAuditRelativeTime(now, item.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{item.message}</p>
                    <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5055D2] hover:underline" href={item.href} onClick={onClose}>
                      Otvori
                      <ArrowUpRight aria-hidden="true" size={13} />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-[var(--card-border)] p-2">
        <Link
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#5055D2] hover:bg-[var(--bg-muted)]"
          href="/admin/logs"
          onClick={onClose}
        >
          Pregled svih izmena
          <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </>
  );
}

function EmptyPanel({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
      <span className="text-[var(--text-tertiary)]">{icon}</span>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
