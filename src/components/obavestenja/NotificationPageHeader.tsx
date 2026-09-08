"use client";

type NotificationPageHeaderProps = {
  unreadCount: number;
  onMarkAllRead: () => void;
};

export function NotificationPageHeader({
  unreadCount,
  onMarkAllRead,
}: NotificationPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-4 py-4 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:px-5 lg:py-5">
      <div>
        <p className="text-sm font-light text-black/55 lg:text-base">
          {unreadCount === 0
            ? "Nema novih obaveštenja"
            : `${unreadCount} nepročitan${unreadCount === 1 ? "o" : "a"} obaveštenj${unreadCount === 1 ? "e" : "a"}`}
        </p>
      </div>
      {unreadCount > 0 ? (
        <button
          className="rounded-full bg-[#EFF1F4] px-4 py-2 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 lg:text-sm"
          onClick={onMarkAllRead}
          type="button"
        >
          Označi sve kao pročitano
        </button>
      ) : null}
    </div>
  );
}

export default NotificationPageHeader;
