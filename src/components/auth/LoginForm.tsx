"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard, Eye, EyeOff } from "lucide-react";
import { FormEvent, useCallback, useId, useState } from "react";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useToast } from "@/components/shared/toast/useToast";
import { useClerkStudentRouting } from "@/hooks/useClerkStudentRouting";
import {
  EMAIL_NOT_VERIFIED_MESSAGE,
  readCachedStudentSession,
  useStudentSession,
} from "@/hooks/useStudentSession";
import { ApiError } from "@/lib/api/client";
import { resolveStudentLandingPathSync, markLandingPrefForApply } from "@/lib/app-preferences";
import { useT } from "@/i18n/useT";
import {
  isStudentOAuthConfigured,
  signInWithStudentOAuth,
} from "@/lib/student-oauth";

type LoginFormState = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

const initialFormState: LoginFormState = {
  identifier: "",
  password: "",
  rememberMe: false,
};

type LoginErrors = Partial<Record<keyof LoginFormState, string>>;

function validateLogin(
  form: LoginFormState,
  t: (key: string) => string,
): LoginErrors {
  const errors: LoginErrors = {};

  if (!form.identifier.trim()) {
    errors.identifier = t("auth.identifierRequired");
  }

  if (!form.password) {
    errors.password = t("auth.passwordRequired");
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useT();
  const { login, usesBackend } = useStudentSession();
  const formId = useId();
  const [form, setForm] = useState<LoginFormState>(initialFormState);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);
  const oauthReady = isStudentOAuthConfigured();

  const isExplicitLogout = searchParams.get("logout") === "1";

  const resolveLoginDestination = useCallback(() => {
    return resolveStudentLandingPathSync({
      userId: readCachedStudentSession()?.userId,
      nextParam: searchParams.get("next"),
    });
  }, [searchParams]);

  useClerkStudentRouting({
    resolveHomePath: resolveLoginDestination,
    skipOnboardingRedirect: true,
    suppressAutoRouting: isExplicitLogout,
  });

  function navigateAfterLogin() {
    router.push(resolveLoginDestination());
  }

  function updateField<K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSocialAuth(provider: "google" | "apple") {
    setSocialMessage(null);
    setSubmitError(null);

    if (!oauthReady) {
      setSocialMessage(t("auth.oauthNotConfigured"));
      return;
    }

    try {
      await signInWithStudentOAuth(provider);
    } catch (error) {
      setSocialMessage(
        error instanceof Error ? error.message : t("auth.oauthFailed"),
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSocialMessage(null);

    const validationErrors = validateLogin(form, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const success = await login(form.identifier.trim(), form.password);
      if (usesBackend && !success) {
        setSubmitError(t("auth.invalidCredentials"));
        return;
      }

      toast.success(t("auth.signInSuccess"));
      markLandingPrefForApply();
      navigateAfterLogin();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setSubmitError(error.message || EMAIL_NOT_VERIFIED_MESSAGE);
        router.push(
          `/auth/verify-pending?email=${encodeURIComponent(
            form.identifier.includes("@") ? form.identifier.trim() : "",
          )}`,
        );
        return;
      }
      if (error instanceof ApiError && error.message) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError(t("auth.invalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const identifierId = `${formId}-identifier`;
  const passwordId = `${formId}-password`;
  const rememberId = `${formId}-remember`;

  return (
    <>
      <header className="mb-8 lg:mb-10">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black lg:text-4xl">
          {t("auth.welcomeBack")}
        </h2>
        <p className="text-sm font-light leading-relaxed text-black/55 lg:text-base">
          {t("auth.signInSubtitle")}
        </p>
      </header>

      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            className="text-xs font-semibold uppercase tracking-wide text-black/45"
            htmlFor={identifierId}
          >
            {t("auth.identifierLabel")}
          </label>
          <div className="relative">
            <CreditCard
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35"
              size={18}
            />
            <input
              aria-invalid={Boolean(errors.identifier)}
              autoComplete="username"
              className="w-full rounded-xl border border-black/8 bg-white py-2.5 pl-11 pr-4 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400"
              id={identifierId}
              onChange={(event) => updateField("identifier", event.target.value)}
              placeholder={t("auth.identifierPlaceholder")}
              type="text"
              value={form.identifier}
            />
          </div>
          {errors.identifier ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.identifier}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-black/45"
              htmlFor={passwordId}
            >
              {t("auth.passwordLabel")}
            </label>
            <Link
              className="text-xs font-semibold text-[#5055D2] transition-colors hover:underline"
              href="/auth/forgot-password"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <input
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-black/8 bg-white py-2.5 pl-4 pr-11 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400"
              id={passwordId}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type={showPassword ? "text" : "password"}
              value={form.password}
            />
            <button
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
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

        <label className="flex cursor-pointer items-center gap-2.5" htmlFor={rememberId}>
          <input
            checked={form.rememberMe}
            className="size-4 rounded border-black/20 text-[#5055D2] focus:ring-[#5055D2]/30"
            id={rememberId}
            onChange={(event) => updateField("rememberMe", event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-light text-black/65">{t("auth.rememberMe")}</span>
        </label>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:text-base"
          disabled={isSubmitting}
          style={{
            backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
          }}
          type="submit"
        >
          {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          {!isSubmitting ? <ArrowRight aria-hidden="true" size={18} /> : null}
        </button>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/8" />
          </div>
          <span className="relative bg-white px-4 text-xs font-semibold uppercase tracking-wide text-black/45">
            {t("auth.socialDivider")}
          </span>
        </div>

        <SocialAuthButtons
          disabled={isSubmitting || !oauthReady}
          forceAccountPicker
          oauthRedirectPath="/"
          onAppleClick={() => void handleSocialAuth("apple")}
          onGoogleClick={() => void handleSocialAuth("google")}
          onGoogleError={setSocialMessage}
          variant="light"
        />

        {!oauthReady ? (
          <p className="text-center text-xs text-black/45">
            {t("auth.clerkHint")}
          </p>
        ) : null}

        {submitError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700" role="alert">
            {submitError}
          </p>
        ) : null}

        {socialMessage ? (
          <p className="text-center text-sm text-black/55" role="status">
            {socialMessage}
          </p>
        ) : null}
      </form>

      <p className="mt-8 text-center text-sm font-light text-black/55 lg:text-base">
        {t("auth.noAccount")}{" "}
        <Link className="font-semibold text-[#5055D2] transition-colors hover:underline" href="/register">
          {t("auth.register")}
        </Link>
      </p>
    </>
  );
}
