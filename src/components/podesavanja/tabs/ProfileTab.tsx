"use client";

import { useEffect, useState } from "react";
import type { ProfileSettings } from "@/lib/podesavanja-mock";
import {
  createEmptyFastingPreferences,
  type FastingPreferences,
} from "@/lib/fasting-preferences";
import type { UserReligion } from "@/lib/user-preferences";
import { ChangeReligionConfirmModal } from "@/components/podesavanja/ChangeReligionConfirmModal";
import { SettingsField } from "@/components/podesavanja/SettingsField";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { FastingChoiceFieldset } from "@/components/shared/FastingChoiceFieldset";
import { ReligionPickerFieldset } from "@/components/shared/ReligionPickerFieldset";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useToast } from "@/components/shared/toast/useToast";
import { resolveStudentProfileKind } from "@/lib/student-profile";
import { PROFILE_READONLY_HINT } from "@/lib/student-profile-constants";
import { submitProfileChangeRequestAsync } from "@/lib/profile-change-requests-store";

type ProfileTabProps = {
  initialData: ProfileSettings;
  initialFasting: FastingPreferences;
  onSave: (data: ProfileSettings, fasting: FastingPreferences) => void;
  onSaveSilent: (data: ProfileSettings, fasting: FastingPreferences) => void;
  savedMessage: string | null;
  onClearSavedMessage: () => void;
};

function validateProfile(data: ProfileSettings): Partial<Record<keyof ProfileSettings, string>> {
  if (!data.religion) {
    return { religion: "Izaberite jednu opciju." };
  }
  return {};
}

export function ProfileTab({
  initialData,
  initialFasting,
  onSave,
  onSaveSilent,
  savedMessage,
  onClearSavedMessage,
}: ProfileTabProps) {
  const profile = useStudentProfile();
  const toast = useToast();
  const [form, setForm] = useState(initialData);
  const [fasting, setFasting] = useState(initialFasting);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileSettings, string>>>({});
  const [pendingReligion, setPendingReligion] = useState<UserReligion | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => {
      const next: ProfileSettings = {
        ...initialData,
        firstName: initialData.firstName || profile.firstName,
        lastName: initialData.lastName || profile.lastName,
        email: initialData.email || profile.email,
        faculty: initialData.faculty || profile.faculty,
        generation: initialData.generation || profile.generation || profile.indexNumber,
        studentKind: initialData.studentKind ?? profile.studentKind,
        cardNumber: initialData.cardNumber || profile.cardNumber,
      };

      const unchanged =
        current.firstName === next.firstName &&
        current.lastName === next.lastName &&
        current.email === next.email &&
        current.faculty === next.faculty &&
        current.generation === next.generation &&
        current.studentKind === next.studentKind &&
        current.cardNumber === next.cardNumber &&
        current.religion === next.religion;

      return unchanged ? current : next;
    });
    setFasting((current) =>
      current.sredaPetak === initialFasting.sredaPetak &&
      current.velikiPost2026 === initialFasting.velikiPost2026 &&
      current.ramazan2026 === initialFasting.ramazan2026
        ? current
        : initialFasting,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData.cardNumber,
    initialData.email,
    initialData.faculty,
    initialData.firstName,
    initialData.generation,
    initialData.lastName,
    initialData.religion,
    initialData.studentKind,
    initialFasting.ramazan2026,
    initialFasting.sredaPetak,
    initialFasting.velikiPost2026,
    profile.cardNumber,
    profile.email,
    profile.faculty,
    profile.firstName,
    profile.generation,
    profile.indexNumber,
    profile.lastName,
    profile.studentKind,
  ]);

  function updateField<K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) {
    onClearSavedMessage();
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleReligionSelect(next: UserReligion) {
    if (next === form.religion) {
      return;
    }
    setPendingReligion(next);
  }

  function confirmReligionChange() {
    if (!pendingReligion) {
      return;
    }

    const nextReligion = pendingReligion;
    const nextFasting = createEmptyFastingPreferences();
    const nextProfile = {
      ...initialData,
      religion: nextReligion,
    };

    updateField("religion", nextReligion);
    setFasting(nextFasting);
    setPendingReligion(null);
    onSaveSilent(nextProfile, nextFasting);
  }

  function cancelReligionChange() {
    setPendingReligion(null);
  }

  function handleSave() {
    const nextErrors = validateProfile(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave(
      {
        ...initialData,
        religion: form.religion,
      },
      fasting,
    );
  }

  function handleCancel() {
    setForm(initialData);
    setFasting(initialFasting);
    setErrors({});
    setPendingReligion(null);
    onClearSavedMessage();
  }

  const displayName =
    `${form.firstName} ${form.lastName}`.trim() ||
    profile.displayName ||
    `${profile.firstName} ${profile.lastName}`.trim() ||
    "Korisnik";
  const profileSubtitle = profile.subtitle;
  const studentKind = resolveStudentProfileKind({
    studentKind: form.studentKind ?? profile.studentKind,
    indexNumber: form.generation || profile.generation,
    generation: form.generation || profile.generation,
  });
  const schoolOrFacultyLabel = studentKind === "ucenik" ? "Škola" : "Fakultet";

  async function handleSubmitChangeRequest() {
    const cardNumber = profile.cardNumber || form.cardNumber || "";
    if (!cardNumber || !profile.email) return;
    const result = await submitProfileChangeRequestAsync(profile.email, displayName, cardNumber);
    if (result.ok) {
      toast.success("Zahtev je poslat referentu. Idite do studentskog centra da izmenite podatke.");
    } else {
      toast.error(result.error);
    }
  }

  const mounted = useClientMounted();
  const showProfileHeaderLoading = !mounted || !profile.isIdentityLoaded;

  return (
    <SettingsShell
      description="Ažurirajte preference. Lični podaci i kartica menjaju se preko referenta."
      onCancel={handleCancel}
      onSave={handleSave}
      savedMessage={savedMessage}
      title="Profil"
    >
      <div className="flex items-center gap-4 rounded-2xl bg-[#EFF1F4]/60 p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-white lg:size-20">
          {showProfileHeaderLoading ? (
            <div className="size-full animate-pulse rounded-full bg-black/10" />
          ) : (
            <StudentAvatar
              alt={displayName}
              fallbackSrc={profile.avatarFallbackUrl}
              sizes="80px"
              src={profile.avatarUrl}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-black">
            {showProfileHeaderLoading ? (
              <span className="inline-block h-6 w-40 animate-pulse rounded bg-black/10" />
            ) : (
              displayName
            )}
          </p>
          <p className="text-sm font-light text-black/55">
            {showProfileHeaderLoading ? (
              <span className="inline-block h-4 w-32 animate-pulse rounded bg-black/10" />
            ) : profileSubtitle ? (
              profileSubtitle
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#5055D2]/5 px-4 py-3">
        <p className="text-sm text-[#5055D2]">{PROFILE_READONLY_HINT}</p>
        <button
          className="whitespace-nowrap rounded-full bg-[#5055D2] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          onClick={() => void handleSubmitChangeRequest()}
          type="button"
        >
          Pošalji zahtev za izmenu
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SettingsField
          autoComplete="given-name"
          disabled
          id="profile-first-name"
          label="Ime"
          onChange={() => undefined}
          value={form.firstName || profile.firstName}
        />
        <SettingsField
          autoComplete="family-name"
          disabled
          id="profile-last-name"
          label="Prezime"
          onChange={() => undefined}
          value={form.lastName || profile.lastName}
        />
        <SettingsField
          autoComplete="email"
          disabled
          id="profile-email"
          label="Email"
          onChange={() => undefined}
          type="email"
          value={form.email}
        />
        <SettingsField
          autoComplete="off"
          disabled
          id="profile-card"
          label="Broj eMenza kartice"
          onChange={() => undefined}
          value={form.cardNumber}
        />
        <SettingsField
          disabled
          id="profile-faculty"
          label={schoolOrFacultyLabel}
          onChange={() => undefined}
          value={form.faculty || profile.faculty}
        />
        {studentKind === "student" ? (
          <SettingsField
            disabled
            id="profile-generation"
            label="Broj indeksa"
            onChange={() => undefined}
            value={form.generation || profile.indexNumber}
          />
        ) : null}
      </div>

      <ReligionPickerFieldset
        error={errors.religion}
        idPrefix="profile-religion"
        onChange={handleReligionSelect}
        value={form.religion}
      />

      <p className="text-xs font-light leading-relaxed text-black/55 lg:text-sm">
        Veroispovest možete promeniti u bilo kom trenutku. Posle potvrde u dijalogu kliknite{" "}
        <strong className="font-semibold text-black/70">Sačuvaj</strong> na dnu stranice.
      </p>

      {pendingReligion ? (
        <ChangeReligionConfirmModal
          currentReligion={form.religion}
          nextReligion={pendingReligion}
          onCancel={cancelReligionChange}
          onConfirm={confirmReligionChange}
        />
      ) : null}

      <FastingChoiceFieldset
        fasting={fasting}
        idPrefix="profile-fasting"
        onChange={(nextFasting) => {
          onClearSavedMessage();
          setFasting(nextFasting);
        }}
        religion={form.religion}
      />
    </SettingsShell>
  );
}
