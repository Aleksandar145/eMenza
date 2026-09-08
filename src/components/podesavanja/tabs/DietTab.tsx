"use client";

import { useState } from "react";
import type { DietSettings } from "@/lib/podesavanja-mock";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";
import { useT } from "@/i18n/useT";

type DietTabProps = {
  initialData: DietSettings;
  onSave: (data: DietSettings) => void;
  savedMessage: string | null;
  onClearSavedMessage: () => void;
};

export function DietTab({
  initialData,
  onSave,
  savedMessage,
  onClearSavedMessage,
}: DietTabProps) {
  const { t } = useT();
  const [form, setForm] = useState(initialData);

  const dietRestrictionOptions = [
    { id: "none" as const, label: t("settings.diet.restrictionNone") },
    { id: "vegetarian" as const, label: t("settings.diet.restrictionVegetarian") },
    { id: "vegan" as const, label: t("settings.diet.restrictionVegan") },
  ];

  const allergenOptions = [
    { id: "laktoza", label: t("settings.diet.allergenLactose") },
    { id: "gluten", label: t("settings.diet.allergenGluten") },
    { id: "orasasti", label: t("settings.diet.allergenNuts") },
    { id: "jaja", label: t("settings.diet.allergenEggs") },
    { id: "soja", label: t("settings.diet.allergenSoy") },
    { id: "riba", label: t("settings.diet.allergenFish") },
  ];

  function toggleAllergen(allergenId: string) {
    onClearSavedMessage();
    setForm((current) => {
      const hasAllergen = current.allergens.includes(allergenId);
      return {
        ...current,
        allergens: hasAllergen
          ? current.allergens.filter((item) => item !== allergenId)
          : [...current.allergens, allergenId],
      };
    });
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
      description={t("settings.diet.description")}
      onCancel={handleCancel}
      onSave={handleSave}
      savedMessage={savedMessage}
      title={t("settings.diet.title")}
    >
      <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-sm font-light leading-relaxed text-black/60">
        {t("settings.diet.intro")}
      </p>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-black/45">
          {t("settings.diet.dietType")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {dietRestrictionOptions.map((option) => {
            const isActive = form.restriction === option.id;

            return (
              <label
                className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                    : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
                }`}
                key={option.id}
              >
                <input
                  checked={isActive}
                  className="sr-only"
                  name="diet-restriction"
                  onChange={() => {
                    onClearSavedMessage();
                    setForm((current) => ({ ...current, restriction: option.id }));
                  }}
                  type="radio"
                  value={option.id}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-black/45">
          {t("settings.diet.allergens")}
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allergenOptions.map((allergen) => {
            const isChecked = form.allergens.includes(allergen.id);

            return (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  isChecked
                    ? "border-[#5055D2]/30 bg-[#5055D2]/5"
                    : "border-black/8 bg-white hover:border-[#5055D2]/20"
                }`}
                key={allergen.id}
              >
                <input
                  checked={isChecked}
                  className="size-4 rounded border-black/20 text-[#5055D2] focus:ring-[#5055D2]/30"
                  onChange={() => toggleAllergen(allergen.id)}
                  type="checkbox"
                />
                <span className="text-sm font-medium text-black">{allergen.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="diet-note">
          {t("settings.diet.note")}
        </label>
        <textarea
          className="min-h-[100px] w-full resize-y rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-black placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
          id="diet-note"
          onChange={(event) => {
            onClearSavedMessage();
            setForm((current) => ({ ...current, note: event.target.value }));
          }}
          placeholder={t("settings.diet.notePlaceholder")}
          value={form.note}
        />
      </div>
    </SettingsShell>
  );
}
