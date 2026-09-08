"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { ArrowRight, CreditCard } from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import {
  authLabelClassName,
  authPrimaryButtonClassName,
  authPrimaryButtonStyle,
  authSecondaryButtonClassName,
} from "@/components/auth/auth-form-styles";
import {
  type RegisterDraft,
  type RegisterReligion,
  type RegisterRole,
} from "@/lib/register-mock";
import { apiGet } from "@/lib/api/client";
import { ReligionPickerFieldset } from "@/components/shared/ReligionPickerFieldset";

type RegisterStudentStepProps = {
  draft: RegisterDraft;
  cardNumberError?: string | null;
  onClearCardNumberError?: () => void;
  onBack: () => void;
  onContinue: (updates: Partial<RegisterDraft>) => void | Promise<void>;
};

type StudentStepErrors = Partial<
  Record<"religion" | "school" | "faculty" | "indexNumber" | "cardNumber", string>
>;

function validateStudentStep(draft: RegisterDraft): StudentStepErrors {
  const errors: StudentStepErrors = {};

  if (!draft.religion) {
    errors.religion = "Izaberite jednu opciju.";
  }

  if (draft.role === "ucenik") {
    if (!draft.school?.trim()) {
      errors.school = "Izaberite školu.";
    }
  } else {
    if (!draft.faculty?.trim()) {
      errors.faculty = "Izaberite fakultet.";
    }

    if (!draft.indexNumber?.trim()) {
      errors.indexNumber = "Unesite broj indeksa.";
    } else if (!/^\d{3,6}\/\d{4}$/.test(draft.indexNumber.trim())) {
      errors.indexNumber = "Indeks mora biti u formatu npr. 1234/2024.";
    }
  }

  if (!draft.cardNumber.trim()) {
    errors.cardNumber = "Unesite broj kartice.";
  } else if (!/^\d{6,12}$/.test(draft.cardNumber.replace(/\s/g, ""))) {
    errors.cardNumber = "Broj kartice mora imati 6–12 cifara.";
  }

  return errors;
}

export function RegisterStudentStep({
  draft,
  cardNumberError,
  onClearCardNumberError,
  onBack,
  onContinue,
}: RegisterStudentStepProps) {
  const formId = useId();
  const [form, setForm] = useState({
    role: draft.role,
    religion: draft.religion,
    school: draft.school ?? "",
    faculty: draft.faculty ?? "",
    indexNumber: draft.indexNumber ?? "",
    cardNumber: draft.cardNumber,
  });
  const [errors, setErrors] = useState<StudentStepErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [institutions, setInstitutions] = useState<{ name: string; type: string; city: string }[]>([]);

  useEffect(() => {
    apiGet<{ institutions: { name: string; type: string; city: string }[] }>("/api/institutions")
      .then((data) => setInstitutions(data.institutions))
      .catch(() => {
        import("@/lib/register-mock").then((mod) => {
          setInstitutions([
            ...mod.facultyOptions.map((f) => ({ name: f, type: "fakultet" as const, city: "" })),
            ...mod.schoolOptions.map((s) => ({ name: s, type: "skola" as const, city: "" })),
          ]);
        });
      });
  }, []);

  const schoolOptions = institutions
    .filter((i) => i.type === "skola")
    .map((i) => ({ value: i.city ? `${i.name}, ${i.city}` : i.name, label: i.city ? `${i.name}, ${i.city}` : i.name }));
  const facultyOptions = institutions
    .filter((i) => i.type === "fakultet")
    .map((i) => ({ value: i.city ? `${i.name}, ${i.city}` : i.name, label: i.city ? `${i.name}, ${i.city}` : i.name }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      role: draft.role,
      religion: draft.religion,
      school: draft.school ?? "",
      faculty: draft.faculty ?? "",
      indexNumber: draft.indexNumber ?? "",
      cardNumber: draft.cardNumber,
    });
  }, [
    draft.role,
    draft.religion,
    draft.school,
    draft.faculty,
    draft.indexNumber,
    draft.cardNumber,
  ]);

  const cardLabel =
    form.role === "ucenik" ? "Broj učeničke kartice" : "Broj studentske kartice";
  const displayedCardNumberError = errors.cardNumber ?? cardNumberError ?? undefined;
  const oauthLabel =
    draft.authMethod !== "email"
      ? `Prijavljeni kao ${draft.firstName} ${draft.lastName} · ${draft.email}`
      : null;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "cardNumber") {
      onClearCardNumberError?.();
    }
    if (errors[key as keyof StudentStepErrors]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as keyof StudentStepErrors];
        return next;
      });
    }
  }

  function handleRoleChange(role: RegisterRole) {
    setForm((current) => ({ ...current, role }));
    setErrors((current) => {
      const next = { ...current };
      delete next.school;
      delete next.faculty;
      delete next.indexNumber;
      return next;
    });
  }

  function handleReligionChange(religion: RegisterReligion) {
    setForm((current) => ({ ...current, religion }));
    if (errors.religion) {
      setErrors((current) => {
        const next = { ...current };
        delete next.religion;
        return next;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextDraft: RegisterDraft = {
      ...draft,
      ...form,
    };

    const validationErrors = validateStudentStep(nextDraft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onContinue(form);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="mb-6 lg:mb-8">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black lg:text-4xl">
          Podaci kartice
        </h2>
        <p className="text-sm font-light leading-relaxed text-black/55 lg:text-base">
          Unesite školu ili fakultet i broj kartice za pristup menzi. Kartica će biti aktivirana
          nakon verifikacije kod referenta.
        </p>
      </header>

      {oauthLabel ? (
        <p className="mb-4 rounded-xl bg-[#5055D2]/5 px-4 py-3 text-sm font-medium text-[#5055D2]">
          {oauthLabel}
        </p>
      ) : null}

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <fieldset className="space-y-2">
          <legend className={authLabelClassName}>Ja sam</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "ucenik" as const, label: "Učenik" },
                { id: "student" as const, label: "Student" },
              ] as const
            ).map((option) => {
              const isActive = form.role === option.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                      : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
                  }`}
                  key={option.id}
                  onClick={() => handleRoleChange(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <ReligionPickerFieldset
          error={errors.religion}
          idPrefix={`${formId}-religion`}
          onChange={handleReligionChange}
          value={form.religion}
        />

        {form.role === "ucenik" ? (
          <div className="space-y-1.5">
            <label className={authLabelClassName} htmlFor={`${formId}-school`}>
              Škola
            </label>
            <select
              aria-invalid={Boolean(errors.school)}
              className="w-full rounded-xl border border-black/8 bg-white py-2.5 px-4 text-sm text-black transition-colors focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400"
              id={`${formId}-school`}
              onChange={(event) => updateField("school", event.target.value)}
              value={form.school}
            >
              <option value="">Izaberite školu</option>
              {schoolOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.school ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.school}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className={authLabelClassName} htmlFor={`${formId}-faculty`}>
                Fakultet
              </label>
              <select
                aria-invalid={Boolean(errors.faculty)}
                className="w-full rounded-xl border border-black/8 bg-white py-2.5 px-4 text-sm text-black transition-colors focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400"
                id={`${formId}-faculty`}
                onChange={(event) => updateField("faculty", event.target.value)}
                value={form.faculty}
              >
                <option value="">Izaberite fakultet</option>
                {facultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.faculty ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.faculty}
                </p>
              ) : null}
            </div>

            <AuthField
              autoComplete="off"
              error={errors.indexNumber}
              id={`${formId}-index`}
              label="Broj indeksa"
              onChange={(value) => updateField("indexNumber", value)}
              placeholder="1234/2024"
              value={form.indexNumber}
            />
          </>
        )}

        <AuthField
          autoComplete="off"
          error={displayedCardNumberError}
          id={`${formId}-card-number`}
          inputMode="numeric"
          label={cardLabel}
          leadingIcon={<CreditCard aria-hidden="true" size={18} />}
          onChange={(value) => updateField("cardNumber", value.replace(/\D/g, ""))}
          placeholder="123456789"
          value={form.cardNumber}
        />

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <button
            className={authSecondaryButtonClassName}
            disabled={isSubmitting}
            onClick={onBack}
            type="button"
          >
            Nazad
          </button>
          <button
            className={authPrimaryButtonClassName}
            disabled={isSubmitting}
            style={authPrimaryButtonStyle}
            type="submit"
          >
            {isSubmitting ? "Nastavljanje..." : "Nastavi"}
            {!isSubmitting ? <ArrowRight aria-hidden="true" size={18} /> : null}
          </button>
        </div>
      </form>
    </>
  );
}

export default RegisterStudentStep;
