"use client";

import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "@/lib/podesavanja-mock";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";
import { useT } from "@/i18n/useT";

type AppTabProps = {
  initialData: AppSettings;
  onSave: (data: AppSettings) => void;
  savedMessage: string | null;
  onClearSavedMessage: () => void;
};

export function AppTab({
  initialData,
  onSave,
  savedMessage,
  onClearSavedMessage,
}: AppTabProps) {
  const { t } = useT();
  const [form, setForm] = useState(initialData);
  const isDirtyRef = useRef(false);

  const landingOptions = [
    {
      value: "dashboard" as const,
      label: t("settings.app.landingDashboard"),
      description: t("settings.app.landingDashboardDesc"),
    },
    {
      value: "rezervacije" as const,
      label: t("settings.app.landingReservations"),
      description: t("settings.app.landingReservationsDesc"),
    },
  ];

  useEffect(() => {
    if (!isDirtyRef.current) {
      setForm(initialData);
    }
  }, [initialData]);

  function updateForm(next: AppSettings) {
    isDirtyRef.current = true;
    onClearSavedMessage();
    setForm(next);
  }

  function handleSave() {
    onSave(form);
    isDirtyRef.current = false;
  }

  function handleCancel() {
    isDirtyRef.current = false;
    setForm(initialData);
    onClearSavedMessage();
  }

  const activeLanguage =
    form.language === "en" ? t("settings.app.languageEn") : t("settings.app.languageSr");
  const activeLanding = landingOptions.find((option) => option.value === form.defaultLandingPage)?.label;

  return (
    <SettingsShell
      description={t("settings.app.description")}
      onCancel={handleCancel}
      onSave={handleSave}
      savedMessage={savedMessage}
      title={t("settings.app.title")}
    >
      <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-sm font-light text-black/60">
        {t("settings.app.current")}{" "}
        <strong className="font-semibold text-black/75">{activeLanguage}</strong>
        {" · "}
        {t("settings.app.landingAfterLogin")}{" "}
        <strong className="font-semibold text-black/75">{activeLanding}</strong>
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="app-language">
          {t("settings.app.languageLabel")}
        </label>
        <select
          className="w-full max-w-md rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
          id="app-language"
          onChange={(event) => {
            updateForm({
              ...form,
              language: event.target.value as AppSettings["language"],
            });
          }}
          value={form.language}
        >
          <option value="sr">{t("settings.app.languageSr")}</option>
          <option value="en">{t("settings.app.languageEn")}</option>
        </select>
        <p className="text-xs font-light text-black/45">{t("settings.app.languageHint")}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-black/45">
          {t("settings.app.landingLegend")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {landingOptions.map((option) => {
            const isActive = form.defaultLandingPage === option.value;

            return (
              <button
                aria-pressed={isActive}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                    : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
                }`}
                key={option.value}
                onClick={() => {
                  updateForm({
                    ...form,
                    defaultLandingPage: option.value,
                  });
                }}
                type="button"
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <p
                  className={`mt-1 text-xs font-light leading-relaxed ${
                    isActive ? "text-[#5055D2]/80" : "text-black/55"
                  }`}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-xs font-light text-black/45">{t("settings.app.landingHint")}</p>
      </fieldset>
    </SettingsShell>
  );
}
