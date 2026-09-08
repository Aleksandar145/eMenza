"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarDays, CreditCard, Info, Shield, Sparkles, UtensilsCrossed } from "lucide-react";
import {
  getCategoryLabel,
  type NotificationCategory,
  type NotificationItem,
} from "@/lib/obavestenja-mock";

const categoryConfig: Record<
  NotificationCategory,
  { icon: LucideIcon; iconClass: string; bgClass: string }
> = {
  reservation: {
    icon: CalendarDays,
    iconClass: "text-[#5055D2]",
    bgClass: "bg-[#5055D2]/10",
  },
  payment: {
    icon: CreditCard,
    iconClass: "text-[#2f8f55]",
    bgClass: "bg-[#55de9a]/15",
  },
  menu: {
    icon: UtensilsCrossed,
    iconClass: "text-[#4f85ff]",
    bgClass: "bg-[#4f85ff]/10",
  },
  system: {
    icon: Info,
    iconClass: "text-[#6B7280]",
    bgClass: "bg-[#EFF1F4]",
  },
  administration: {
    icon: Shield,
    iconClass: "text-[#5055D2]",
    bgClass: "bg-[#5055D2]/10",
  },
  religion: {
    icon: Sparkles,
    iconClass: "text-[#2f8f55]",
    bgClass: "bg-[#2f8f55]/10",
  },
};

type NotificationCardProps = {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
};

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const { icon: Icon, iconClass, bgClass } = categoryConfig[notification.category];
  const isImportant = notification.priority === "important";

  return (
    <button
      className={`w-full rounded-2xl border p-4 text-left transition-colors lg:p-5 ${
        notification.read
          ? "border-black/5 bg-[#EFF1F4]/60 hover:bg-[#EFF1F4]"
          : "border-[#5055D2]/15 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-[#5055D2]/25"
      } ${isImportant ? "border-amber-300 bg-amber-50/40" : ""}`}
      onClick={() => onMarkRead(notification.id)}
      type="button"
    >
      <div className="flex gap-3 lg:gap-4">
        <div
          className={`relative flex size-10 shrink-0 items-center justify-center rounded-2xl lg:size-11 ${
            isImportant ? "bg-amber-100" : bgClass
          }`}
        >
          {isImportant ? (
            <AlertTriangle aria-hidden="true" className="text-amber-600" size={20} />
          ) : (
            <Icon aria-hidden="true" className={iconClass} size={20} />
          )}
          {!notification.read ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#5055D2]"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <h3
              className={`text-sm lg:text-base ${
                notification.read ? "font-semibold text-black/75" : "font-bold text-black"
              }`}
            >
              {notification.title}
            </h3>
            <span className="shrink-0 text-[11px] font-light text-black/45 lg:text-xs">
              {notification.time}
            </span>
          </div>
          <p
            className="text-sm leading-relaxed text-black/65 lg:text-[15px]"
            dangerouslySetInnerHTML={{ __html: notification.message }}
          />
          {notification.actionHref && notification.actionLabel ? (
            <Link
              className="mt-3 inline-flex items-center rounded-full bg-[#5055D2]/10 px-3 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/15"
              href={notification.actionHref}
              onClick={(event) => event.stopPropagation()}
            >
              {notification.actionLabel}
            </Link>
          ) : null}
          <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wide text-black/40">
            {getCategoryLabel(notification.category)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default NotificationCard;
