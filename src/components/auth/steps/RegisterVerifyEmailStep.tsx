"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { clerkSignOutForAccountSwitch } from "@/components/auth/ClerkOAuthButton";
import {
  authPrimaryButtonClassName,
  authPrimaryButtonStyle,
  authSecondaryButtonClassName,
} from "@/components/auth/auth-form-styles";
import { checkRegisterEmailAvailable, REGISTER_EMAIL_EXISTS_MESSAGE } from "@/lib/backend/register-api";
import { resolveStudentLandingPathSync, markLandingPrefForApply } from "@/lib/app-preferences";
import { ApiError } from "@/lib/api/client";
import { readCachedStudentSession, useStudentSession } from "@/hooks/useStudentSession";
import { isClientBackendEnabled } from "@/lib/backend-config";
import type { RegisterAuthMethod, RegisterDraft } from "@/lib/register-mock";

type RegisterVerifyEmailStepProps = {
  draft: RegisterDraft;
  emailError?: string | null;
  onBack: () => void;
  onConfirm: (updates: Partial<RegisterDraft>) => void | Promise<void>;
};

type PendingOAuthProfile = {
  email: string;
  firstName: string;
  lastName: string;
  authMethod: RegisterAuthMethod;
};

function inferAuthMethodFromEmail(email: string): RegisterAuthMethod {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) {
    return "apple";
  }

  return "google";
}

export function RegisterVerifyEmailStep({
  draft,
  emailError,
  onBack,
  onConfirm,
}: RegisterVerifyEmailStepProps) {
  const router = useRouter();
  const {
    isSessionValidated,
    oauthPendingUser,
    refreshSession,
    sessionError,
    sessionStatus,
  } = useStudentSession();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(emailError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingAccount, setIsChangingAccount] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitError(emailError ?? null);
  }, [emailError]);

  useEffect(() => {
    if (!isClientBackendEnabled() || !isSessionValidated) {
      return;
    }

    if (sessionStatus === "student") {
      markLandingPrefForApply();
      router.replace(
        resolveStudentLandingPathSync({
          userId: readCachedStudentSession()?.userId,
          nextParam: null,
        }),
      );
    }
  }, [isSessionValidated, router, sessionStatus]);

  const profile = useMemo((): PendingOAuthProfile | null => {
    if (!oauthPendingUser) {
      return null;
    }

    return {
      ...oauthPendingUser,
      authMethod: inferAuthMethodFromEmail(oauthPendingUser.email),
    };
  }, [oauthPendingUser]);

  const loadError = useMemo(() => {
    if (!isClientBackendEnabled()) {
      return null;
    }

    if (!clerkLoaded) {
      return null;
    }

    if (!isSignedIn) {
      return "Nema aktivne OAuth sesije. Vratite se i izaberite Google ili Apple nalog.";
    }

    if (sessionStatus === "loading" || !isSessionValidated) {
      return null;
    }

    if (sessionStatus === "error") {
      return sessionError ?? "Učitavanje podataka naloga nije uspelo.";
    }

    if (sessionStatus === "guest") {
      return sessionError ?? "Nema aktivne OAuth sesije. Vratite se i izaberite Google ili Apple nalog.";
    }

    return null;
  }, [
    clerkLoaded,
    isSessionValidated,
    isSignedIn,
    sessionError,
    sessionStatus,
  ]);

  const isLoadingProfile =
    isClientBackendEnabled() &&
    (!clerkLoaded || !isSessionValidated || sessionStatus === "loading");

  async function handleConfirm() {
    if (!profile) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await checkRegisterEmailAvailable(profile.email);
      await onConfirm({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        authMethod: profile.authMethod,
        termsAccepted: draft.termsAccepted || true,
        oauthEmailConfirmed: true,
        password: undefined,
      });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : REGISTER_EMAIL_EXISTS_MESSAGE;
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangeAccount() {
    setIsChangingAccount(true);
    try {
      await clerkSignOutForAccountSwitch();
      onBack();
    } finally {
      setIsChangingAccount(false);
    }
  }

  function handleRetry() {
    refreshSession();
  }

  return (
    <>
      <header className="mb-6 lg:mb-8">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black lg:text-4xl">
          Potvrdite email
        </h2>
        <p className="text-sm font-light leading-relaxed text-black/55 lg:text-base">
          Proverite da li je ovo email koji želite da koristite za eMenza nalog. Nakon potvrde
          nastavljate na unos podataka kartice.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      ) : null}

      {profile ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#5055D2]">
              <Mail aria-hidden="true" size={16} />
              Izabrani nalog
            </div>
            <p className="text-base font-semibold text-black">{profile.email}</p>
            {(profile.firstName || profile.lastName) && (
              <p className="mt-1 text-sm text-black/55">
                {[profile.firstName, profile.lastName].filter(Boolean).join(" ")}
              </p>
            )}
          </div>

          <p className="text-sm text-black/55">
            Google ili Apple je već potvrdio vlasništvo nad ovom adresom. Kliknite ispod da je
            prihvatite za registraciju.
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <button
              className={authSecondaryButtonClassName}
              disabled={isSubmitting || isChangingAccount}
              onClick={() => void handleChangeAccount()}
              type="button"
            >
              {isChangingAccount ? "Odjava..." : "Promeni nalog"}
            </button>
            <button
              className={authPrimaryButtonClassName}
              disabled={isSubmitting || isChangingAccount || !profile}
              onClick={() => void handleConfirm()}
              style={authPrimaryButtonStyle}
              type="button"
            >
              {isSubmitting ? "Potvrda..." : "Potvrdi email"}
              {!isSubmitting ? <ArrowRight aria-hidden="true" size={18} /> : null}
            </button>
          </div>
        </div>
      ) : loadError ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            className={`${authSecondaryButtonClassName} w-full`}
            onClick={onBack}
            type="button"
          >
            Nazad na registraciju
          </button>
          <button
            className={`${authPrimaryButtonClassName} w-full`}
            onClick={handleRetry}
            style={authPrimaryButtonStyle}
            type="button"
          >
            Pokušaj ponovo
          </button>
        </div>
      ) : (
        <p className="text-sm text-black/55">
          {isLoadingProfile || !clerkLoaded
            ? "Učitavanje podataka naloga..."
            : "Priprema OAuth sesije..."}
        </p>
      )}

      {submitError ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}
    </>
  );
}

export default RegisterVerifyEmailStep;
