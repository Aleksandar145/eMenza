"use client";

import { useState } from "react";
import type { NotificationSettings } from "@/lib/podesavanja-mock";
import type { UserReligion } from "@/lib/user-preferences";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";
import { SettingsToggle } from "@/components/podesavanja/SettingsToggle";
import { useT } from "@/i18n/useT";

type NotificationsTabProps = {
  initialData: NotificationSettings;
  religion: UserReligion;
  onSave: (data: NotificationSettings) => void;
  savedMessage: string | null;
  onClearSavedMessage: () => void;
};

const reminderTimeValues: NotificationSettings["reminderTime"][] = ["08:00", "12:00", "18:00"];

const reminderTimeMessageKeys = {
  "08:00": "settings.notifications.reminderBeforeBreakfast",
  "12:00": "settings.notifications.reminderBeforeLunch",
  "18:00": "settings.notifications.reminderBeforeDinner",
} as const;

export function NotificationsTab({
  initialData,
  religion,
  onSave,
  savedMessage,
  onClearSavedMessage,
}: NotificationsTabProps) {
  const { t } = useT();
  const [form, setForm] = useState(initialData);

  function updateField<K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) {
    onClearSavedMessage();
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    onSave(form);
  }

  function handleCancel() {
    setForm(initialData);
    onClearSavedMessage();
  }

  return (
    <SettingsShell
      description={t("settings.notifications.description")}
      onCancel={handleCancel}
      onSave={handleSave}
      savedMessage={savedMessage}
      title={t("settings.notifications.title")}
    >
      <div className="space-y-3">
        <SettingsToggle
          checked={form.reservationReminder}
          description={t("settings.notifications.reservationReminderDesc")}
          id="notif-reservation"
          label={t("settings.notifications.reservationReminder")}
          onChange={(checked) => updateField("reservationReminder", checked)}
        />
        <SettingsToggle
          checked={form.canteenAnnouncements}
          description={t("settings.notifications.canteenAnnouncementsDesc")}
          id="notif-canteen"
          label={t("settings.notifications.canteenAnnouncements")}
          onChange={(checked) => updateField("canteenAnnouncements", checked)}
        />
        <SettingsToggle
          checked={form.lowBalanceAlert}
          description={t("settings.notifications.lowBalanceAlertDesc")}
          id="notif-balance"
          label={t("settings.notifications.lowBalanceAlert")}
          onChange={(checked) => updateField("lowBalanceAlert", checked)}
        />
        <SettingsToggle
          checked={form.promotionsAndMenu}
          description={t("settings.notifications.promotionsAndMenuDesc")}
          id="notif-promo"
          label={t("settings.notifications.promotionsAndMenu")}
          onChange={(checked) => updateField("promotionsAndMenu", checked)}
        />
      </div>

      {religion === "hristijanstvo" ? (
        <div className="space-y-3 rounded-2xl border border-[#b45309]/15 bg-[#b45309]/5 p-4">
          <p className="text-sm font-semibold text-[#b45309]">
            {t("settings.notifications.christianSectionTitle")}
          </p>
          <SettingsToggle
            checked={form.christianFastingMenuReminders}
            description={t("settings.notifications.christianFastingMenuRemindersDesc")}
            id="notif-christian-post"
            label={t("settings.notifications.christianFastingMenuReminders")}
            onChange={(checked) => updateField("christianFastingMenuReminders", checked)}
          />
          <SettingsToggle
            checked={form.christianDailyPosnoAlerts}
            description={t("settings.notifications.christianDailyPosnoAlertsDesc")}
            id="notif-christian-posno"
            label={t("settings.notifications.christianDailyPosnoAlerts")}
            onChange={(checked) => updateField("christianDailyPosnoAlerts", checked)}
          />
        </div>
      ) : null}

      {religion === "islam" ? (
        <div className="space-y-3 rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 p-4">
          <p className="text-sm font-semibold text-[#5055D2]">
            {t("settings.notifications.islamSectionTitle")}
          </p>
          <SettingsToggle
            checked={form.islamRamadanMenuSignup}
            description={t("settings.notifications.islamRamadanMenuSignupDesc")}
            id="notif-islam-ramadan"
            label={t("settings.notifications.islamRamadanMenuSignup")}
            onChange={(checked) => updateField("islamRamadanMenuSignup", checked)}
          />
          <SettingsToggle
            checked={form.islamTakeawayReminder}
            description={t("settings.notifications.islamTakeawayReminderDesc")}
            id="notif-islam-poneti"
            label={t("settings.notifications.islamTakeawayReminder")}
            onChange={(checked) => updateField("islamTakeawayReminder", checked)}
          />
        </div>
      ) : null}

      {religion === "ne_zelim" ? (
        <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-sm font-light text-black/55">
          {t("settings.notifications.noReligionHint")}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide text-black/45"
          htmlFor="reminder-time"
        >
          {t("settings.notifications.reminderTime")}
        </label>
        <select
          className="w-full max-w-md rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 disabled:cursor-not-allowed disabled:bg-[#EFF1F4] disabled:text-black/45"
          disabled={!form.reservationReminder}
          id="reminder-time"
          onChange={(event) =>
            updateField("reminderTime", event.target.value as NotificationSettings["reminderTime"])
          }
          value={form.reminderTime}
        >
          {reminderTimeValues.map((value) => (
            <option key={value} value={value}>
              {t(reminderTimeMessageKeys[value])}
            </option>
          ))}
        </select>
      </div>
    </SettingsShell>
  );
}

export default NotificationsTab;
