"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { FormEvent, useId, useState } from "react";
import { AuthField } from "@/components/auth/AuthField";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import {
  authLabelClassName,
  authPrimaryButtonClassName,
  authPrimaryButtonStyle,
} from "@/components/auth/auth-form-styles";
import {
  getRegisterBasicStepErrors,
  MOCK_APPLE_PROFILE,
  MOCK_GOOGLE_PROFILE,
  saveRegisterDraft,
  type RegisterDraft,
} from "@/lib/register-mock";
import {
  isStudentOAuthConfigured,
  signInWithStudentOAuth,
} from "@/lib/student-oauth";

type RegisterBasicStepProps = {
  draft: RegisterDraft;
  emailError?: string | null;
  onClearEmailError?: () => void;
  onContinue: (updates: Partial<RegisterDraft>) => void | Promise<void>;
  onOAuthContinue: (updates: Partial<RegisterDraft>) => void | Promise<void>;
};

type BasicStepErrors = Partial<
  Record<"firstName" | "lastName" | "email" | "password" | "termsAccepted", string>
>;

function validateBasicStep(draft: RegisterDraft): BasicStepErrors {
  return getRegisterBasicStepErrors(draft);
}

export function RegisterBasicStep({
  draft,
  emailError,
  onClearEmailError,
  onContinue,
  onOAuthContinue,
}: RegisterBasicStepProps) {
  const formId = useId();
  const [form, setForm] = useState({
    firstName: draft.authMethod === "email" ? draft.firstName : "",
    lastName: draft.authMethod === "email" ? draft.lastName : "",
    email: draft.authMethod === "email" ? draft.email : "",
    password: draft.authMethod === "email" ? (draft.password ?? "") : "",
    termsAccepted: draft.termsAccepted,
    authMethod: draft.authMethod,
  });
  const [errors, setErrors] = useState<BasicStepErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);
  const oauthReady = isStudentOAuthConfigured();

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value, authMethod: "email" as const }));
    if (key === "email") {
      onClearEmailError?.();
    }
    if (errors[key as keyof BasicStepErrors]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as keyof BasicStepErrors];
        return next;
      });
    }
  }

  const displayedEmailError = errors.email ?? emailError ?? undefined;

  async function handleOAuth(provider: "google" | "apple") {
    setOauthMessage(null);

    if (oauthReady && !form.termsAccepted) {
      setErrors((current) => ({
        ...current,
        termsAccepted: "Morate prihvatiti uslove korišćenja.",
      }));
      setOauthMessage("Prihvatite uslove korišćenja pre registracije putem Google ili Apple.");
      return false;
    }

    if (oauthReady) {
      try {
        await signInWithStudentOAuth(provider);
      } catch (error) {
        setOauthMessage(
          error instanceof Error
            ? error.message
            : "Registracija putem društvenih mreža nije uspela.",
        );
      }
      return false;
    }

    setIsSubmitting(true);
    const profile = provider === "google" ? MOCK_GOOGLE_PROFILE : MOCK_APPLE_PROFILE;
    await new Promise((resolve) => setTimeout(resolve, 400));
    onOAuthContinue({
      ...profile,
      authMethod: provider,
      termsAccepted: true,
      oauthEmailConfirmed: true,
      password: undefined,
    });
    setIsSubmitting(false);
    return false;
  }

  function ensureTermsAcceptedForOAuth() {
    if (form.termsAccepted) {
      saveRegisterDraft({
        ...draft,
        ...form,
        termsAccepted: true,
        oauthEmailConfirmed: false,
      });
      return true;
    }

    setErrors((current) => ({
      ...current,
      termsAccepted: "Morate prihvatiti uslove korišćenja.",
    }));
    setOauthMessage("Prihvatite uslove korišćenja pre registracije putem Google ili Apple.");
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextDraft: RegisterDraft = {
      ...draft,
      ...form,
      authMethod: "email",
    };

    const validationErrors = validateBasicStep(nextDraft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onContinue({
        ...form,
        authMethod: "email",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordId = `${formId}-password`;
  const termsId = `${formId}-terms`;

  return (
    <>
      <header className="mb-6 lg:mb-8">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black lg:text-4xl">
          Kreiraj nalog
        </h2>
        <p className="text-sm font-light leading-relaxed text-black/55 lg:text-base">
          Unesite osnovne podatke za nalog ili nastavite putem Google ili Apple naloga.
        </p>
      </header>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthField
            autoComplete="given-name"
            error={errors.firstName}
            id={`${formId}-first-name`}
            label="Ime"
            onChange={(value) => updateField("firstName", value)}
            placeholder="Petar"
            value={form.firstName}
          />
          <AuthField
            autoComplete="family-name"
            error={errors.lastName}
            id={`${formId}-last-name`}
            label="Prezime"
            onChange={(value) => updateField("lastName", value)}
            placeholder="Petrović"
            value={form.lastName}
          />
        </div>

        <AuthField
          autoComplete="email"
          error={displayedEmailError}
          id={`${formId}-email`}
          label="Email adresa"
          onChange={(value) => updateField("email", value)}
          placeholder="primer@student.rs"
          type="email"
          value={form.email}
        />

        <div className="space-y-1.5">
          <label className={authLabelClassName} htmlFor={passwordId}>
            Lozinka
          </label>
          <div className="relative">
            <input
              aria-invalid={Boolean(errors.password)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-black/8 bg-white py-2.5 px-4 pr-11 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400"
              id={passwordId}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Min. 8 karaktera"
              type={showPassword ? "text" : "password"}
              value={form.password}
            />
            <button
              aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 transition-colors hover:text-[#5055D2]"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-start gap-2.5" htmlFor={termsId}>
            <input
              aria-invalid={Boolean(errors.termsAccepted)}
              checked={form.termsAccepted}
              className="mt-0.5 size-4 shrink-0 rounded border-black/20 text-[#5055D2] focus:ring-[#5055D2]/30"
              id={termsId}
              onChange={(event) => updateField("termsAccepted", event.target.checked)}
              type="checkbox"
            />
            <span className="text-xs font-light leading-relaxed text-black/65">
              Slažem se sa{" "}
              <Link className="font-semibold text-[#5055D2] hover:underline" href="/pomoc">
                Uslovima korišćenja
              </Link>{" "}
              i{" "}
              <Link className="font-semibold text-[#5055D2] hover:underline" href="/pomoc">
                Politikom privatnosti
              </Link>
            </span>
          </label>
          {errors.termsAccepted ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.termsAccepted}
            </p>
          ) : null}
        </div>

        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/8" />
          </div>
          <span className="relative bg-white px-4 text-xs font-semibold uppercase tracking-wide text-black/45">
            Ili nastavi putem
          </span>
        </div>

        <SocialAuthButtons
          disabled={isSubmitting}
          forceAccountPicker
          oauthIntent="signUp"
          oauthRedirectPath="/register?korak=potvrda"
          onAppleClick={() => void handleOAuth("apple")}
          onAppleError={setOauthMessage}
          onBeforeOAuth={ensureTermsAcceptedForOAuth}
          onGoogleClick={() => void handleOAuth("google")}
          onGoogleError={setOauthMessage}
          variant="light"
        />

        {oauthMessage ? (
          <p className="text-center text-sm text-black/55" role="status">
            {oauthMessage}
          </p>
        ) : null}

        {oauthReady ? (
          <p className="text-center text-xs text-black/45">
            Za Google/Apple prvo prihvatite uslove iznad, zatim kliknite dugme.
          </p>
        ) : (
          <p className="text-center text-xs text-black/45">
            Google: dodajte Clerk ključeve u .env.local (vidi docs/CLERK_SETUP.md).
          </p>
        )}

        <button
          className={`${authPrimaryButtonClassName} w-full`}
          disabled={isSubmitting}
          style={authPrimaryButtonStyle}
          type="submit"
        >
          {isSubmitting ? "Nastavljanje..." : "Nastavi"}
          {!isSubmitting ? <ArrowRight aria-hidden="true" size={18} /> : null}
        </button>
      </form>

      <p className="mt-6 text-center text-sm font-light text-black/55 lg:text-base">
        Već imaš nalog?{" "}
        <Link className="font-semibold text-[#5055D2] transition-colors hover:underline" href="/login">
          Prijavi se
        </Link>
      </p>
    </>
  );
}

export default RegisterBasicStep;
