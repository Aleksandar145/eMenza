"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { AppTab } from "@/components/podesavanja/tabs/AppTab";
import { AccountTab } from "@/components/podesavanja/tabs/AccountTab";
import { DietTab } from "@/components/podesavanja/tabs/DietTab";
import { NotificationsTab } from "@/components/podesavanja/tabs/NotificationsTab";
import { PasswordTab, type PasswordFormValues } from "@/components/podesavanja/tabs/PasswordTab";
import { apiPost } from "@/lib/api/client";
import { ProfileTab } from "@/components/podesavanja/tabs/ProfileTab";
import {
  settingsTabs,
  type ProfileSettings,
  type SettingsState,
  type SettingsTabId,
} from "@/lib/podesavanja-mock";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/components/shared/toast/useToast";
import { useT } from "@/i18n/useT";

const SAVED_MESSAGE_DURATION_MS = 3000;

const settingsTabIds = new Set<SettingsTabId>(settingsTabs.map((tab) => tab.id));

const settingsTabLabelKeys: Record<SettingsTabId, string> = {
  profil: "settings.tabs.profile",
  bezbednost: "settings.tabs.security",
  notifikacije: "settings.tabs.notifications",
  ishrana: "settings.tabs.diet",
  aplikacija: "settings.tabs.app",
  nalog: "settings.tabs.account",
};

function parseSettingsTabId(value: string | null): SettingsTabId | null {
  if (!value || !settingsTabIds.has(value as SettingsTabId)) {
    return null;
  }

  return value as SettingsTabId;
}

export function PodesavanjaPage() {
  const searchParams = useSearchParams();
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    return parseSettingsTabId(searchParams.get("tab")) ?? "profil";
  });
  const { settings, persistSettings } = useUserSettings();
  const toast = useToast();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const savedMessageText = t("settings.saved");

  const showSavedFeedback = useCallback(() => {
    setSavedMessage(savedMessageText);
    toast.success(savedMessageText);
  }, [savedMessageText, toast]);

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSavedMessage(null);
    }, SAVED_MESSAGE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  useEffect(() => {
    const tabFromUrl = parseSettingsTabId(searchParams.get("tab"));
    if (tabFromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  function handleProfileSave(profile: ProfileSettings, fasting: SettingsState["fasting"]) {
    persistSettings({ ...settings, profile, fasting });
    showSavedFeedback();
  }

  function handleProfileSaveSilent(profile: ProfileSettings, fasting: SettingsState["fasting"]) {
    persistSettings({ ...settings, profile, fasting });
  }

  function handleNotificationsSave(notifications: SettingsState["notifications"]) {
    persistSettings({ ...settings, notifications });
    showSavedFeedback();
  }

  function handleDietSave(diet: SettingsState["diet"]) {
    persistSettings({ ...settings, diet });
    showSavedFeedback();
  }

  function handleAppSave(app: SettingsState["app"]) {
    persistSettings({ ...settings, app });
    showSavedFeedback();
  }

  async function handlePasswordSave(form: PasswordFormValues) {
    await apiPost("/api/auth/password", {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    showSavedFeedback();
  }

  function handleTabChange(tabId: SettingsTabId) {
    setActiveTab(tabId);
    setSavedMessage(null);
  }

  return (
    <AppLayout
      activeItem={t("nav.items.settings")}
      subtitle={t("settings.pageSubtitle")}
      title={t("settings.pageTitle")}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <nav aria-label={t("settings.sectionsAria")} className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="inline-flex min-w-full rounded-full border border-black/5 bg-white p-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:min-w-0">
            {settingsTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors lg:px-4 lg:text-sm ${
                    isActive
                      ? "bg-[#5055D2] text-white"
                      : "text-black/55 hover:text-[#5055D2]"
                  }`}
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  type="button"
                >
                  {t(settingsTabLabelKeys[tab.id])}
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "profil" ? (
          <ProfileTab
            initialData={settings.profile}
            initialFasting={settings.fasting}
            onClearSavedMessage={() => setSavedMessage(null)}
            onSave={handleProfileSave}
            onSaveSilent={handleProfileSaveSilent}
            savedMessage={savedMessage}
          />
        ) : null}

        {activeTab === "bezbednost" ? (
          <PasswordTab
            onClearSavedMessage={() => setSavedMessage(null)}
            onSave={handlePasswordSave}
            savedMessage={savedMessage}
          />
        ) : null}

        {activeTab === "notifikacije" ? (
          <NotificationsTab
            initialData={settings.notifications}
            onClearSavedMessage={() => setSavedMessage(null)}
            onSave={handleNotificationsSave}
            religion={settings.profile.religion}
            savedMessage={savedMessage}
          />
        ) : null}

        {activeTab === "ishrana" ? (
          <DietTab
            initialData={settings.diet}
            onClearSavedMessage={() => setSavedMessage(null)}
            onSave={handleDietSave}
            savedMessage={savedMessage}
          />
        ) : null}

        {activeTab === "aplikacija" ? (
          <AppTab
            initialData={settings.app}
            onClearSavedMessage={() => setSavedMessage(null)}
            onSave={handleAppSave}
            savedMessage={savedMessage}
          />
        ) : null}

        {activeTab === "nalog" ? <AccountTab account={settings.account} /> : null}
      </div>
    </AppLayout>
  );
}

export default PodesavanjaPage;
