"use client";

import { useMemo, useState } from "react";
import { NotificationCard } from "@/components/obavestenja/NotificationCard";
import { NotificationPageHeader } from "@/components/obavestenja/NotificationPageHeader";
import { useStudentNotificationInbox } from "@/hooks/useStudentNotificationInbox";
import type { NotificationItem } from "@/lib/obavestenja-mock";

type Filter = "all" | "unread" | "reservation" | "payment" | "administration" | "religion";

const filterOptions: { id: Filter; label: string }[] = [
  { id: "all", label: "Sve" },
  { id: "unread", label: "Nepročitano" },
  { id: "reservation", label: "Rezervacije" },
  { id: "payment", label: "Plaćanja" },
  { id: "religion", label: "Vera / meni" },
  { id: "administration", label: "Administracija" },
];

function filterNotifications(items: NotificationItem[], filter: Filter) {
  switch (filter) {
    case "unread":
      return items.filter((item) => !item.read);
    case "reservation":
      return items.filter((item) => item.category === "reservation");
    case "payment":
      return items.filter((item) => item.category === "payment");
    case "administration":
      return items.filter((item) => item.category === "administration");
    case "religion":
      return items.filter((item) => item.category === "religion");
    default:
      return items;
  }
}

export function NotificationList() {
  const { items, unreadCount, markAsRead, markAllAsRead } = useStudentNotificationInbox();
  const [filter, setFilter] = useState<Filter>("all");

  const filteredItems = useMemo(
    () => filterNotifications(items, filter),
    [items, filter],
  );

  return (
    <div className="space-y-4 lg:space-y-5">
      <NotificationPageHeader onMarkAllRead={() => void markAllAsRead()} unreadCount={unreadCount} />

      <section className="rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-3 lg:px-5 lg:py-4">
          <p className="text-xs font-light text-black/55 lg:text-sm">
            {filteredItems.length} prikazanih obaveštenja
          </p>
          <div className="flex flex-wrap gap-1 rounded-full bg-[#EFF1F4] p-1">
            {filterOptions.map((option) => (
              <button
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors lg:px-4 lg:py-1.5 lg:text-sm ${
                  filter === option.id
                    ? "bg-[#5055D2] text-white"
                    : "text-black/55 hover:text-black"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-4 lg:space-y-4 lg:p-5">
          {filteredItems.length > 0 ? (
            filteredItems.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => void markAsRead(id)}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-[#EFF1F4] px-4 py-10 text-center">
              <p className="text-sm font-light text-black/55 lg:text-base">
                Nema obaveštenja za izabrani filter.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default NotificationList;
