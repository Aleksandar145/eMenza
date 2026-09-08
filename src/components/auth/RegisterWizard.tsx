"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AiPreporukaContent } from "@/components/ai-preporuka/AiPreporukaContent";
import { AiPreporukaShell } from "@/components/ai-preporuka/AiPreporukaShell";
import { RegisterWizardShell } from "@/components/auth/RegisterWizardShell";
import { RegisterBasicStep } from "@/components/auth/steps/RegisterBasicStep";
import { RegisterStudentStep } from "@/components/auth/steps/RegisterStudentStep";
import { RegisterVerifyEmailStep } from "@/components/auth/steps/RegisterVerifyEmailStep";
import {
  checkRegisterCardAvailable,
  checkRegisterEmailAvailable,
  REGISTER_CARD_EXISTS_MESSAGE,
  REGISTER_EMAIL_EXISTS_MESSAGE,
} from "@/lib/backend/register-api";
import {
  clearRegisterDraft,
  createEmptyRegisterDraft,
  EMAIL_ONBOARDING_PENDING_KEY,
  getRegisterHref,
  isRegisterBasicStepComplete,
  loadRegisterDraft,
  parseRegisterRouteParam,
  parseRegisterStepParam,
  resolveRegisterStep,
  saveRegisterDraft,
  type RegisterDraft,
  type RegisterStep,
} from "@/lib/register-mock";
import { resolveStudentLandingPathSync, markLandingPrefForApply } from "@/lib/app-preferences";
import { syncRegisterDraftToSettings } from "@/lib/user-settings-store";
import { createCardFromRegistration, loadReferentCardsState } from "@/lib/referent-cards-store";
import { apiPost, ApiError } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildEmailVerifyCallbackUrl } from "@/lib/auth-email-verify";
import {
  fetchUserSettingsFromApi,
  saveUserSettingsViaApi,
} from "@/lib/backend/settings-api";
import { useToast } from "@/components/shared/toast/useToast";
import { readCachedStudentSession, useStudentSession } from "@/hooks/useStudentSession";

function RegisterWizardInner() {
  const router = useRouter();
  const toast = useToast();
  const {
    refreshSession,
    refreshSessionAsync,
    acknowledgeOnboardingComplete,
    isSessionValidated,
    sessionStatus,
    onboardingPending,
  } = useStudentSession();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const searchParams = useSearchParams();
  const registerRoute = parseRegisterRouteParam(searchParams.get("korak"));
  const urlStep = parseRegisterStepParam(searchParams.get("korak"));

  const [draft, setDraft] = useState<RegisterDraft>(() => createEmptyRegisterDraft());
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);

  const emailOnboardingMarker =
    typeof window !== "undefined" &&
    sessionStorage.getItem(EMAIL_ONBOARDING_PENDING_KEY) === "1";

  const isStep3AwaitingSession =
    urlStep === 3 && isClientBackendEnabled() && !isSessionValidated;

  const allowStep3WithoutDraft =
    urlStep === 3 &&
    (onboardingPending || emailOnboardingMarker || isStep3AwaitingSession);

  const currentStep = resolveRegisterStep(
    urlStep,
    draftHydrated ? draft : createEmptyRegisterDraft(),
    { allowStep3WithoutDraft },
  );

  useEffect(() => {
    const loaded = loadRegisterDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loaded);
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) {
      return;
    }

    if (registerRoute === "potvrda") {
      return;
    }

    if (urlStep === 3 && isClientBackendEnabled()) {
      if (!isSessionValidated) {
        return;
      }

      if (onboardingPending || emailOnboardingMarker) {
        return;
      }

      markLandingPrefForApply();
      router.replace(
        resolveStudentLandingPathSync({
          userId: readCachedStudentSession()?.userId,
          nextParam: null,
        }),
      );
      return;
    }

    const requested = urlStep ?? 1;
    if (requested >= 2 && !isRegisterBasicStepComplete(draft)) {
      router.replace(getRegisterHref(1));
    }
  }, [
    draft,
    draftHydrated,
    emailOnboardingMarker,
    isSessionValidated,
    onboardingPending,
    registerRoute,
    router,
    urlStep,
  ]);

  useEffect(() => {
    if (!draftHydrated || registerRoute !== "potvrda" || !isClientBackendEnabled()) {
      return;
    }

    if (!isSessionValidated) {
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
      return;
    }

    if (!isSignedIn && clerkLoaded) {
      router.replace(getRegisterHref(1));
    }
  }, [
    clerkLoaded,
    draftHydrated,
    isSessionValidated,
    isSignedIn,
    registerRoute,
    router,
    sessionStatus,
  ]);

  useEffect(() => {
    if (!draftHydrated || currentStep !== 3 || !isClientBackendEnabled()) {
      return;
    }

    void refreshSession();
  }, [currentStep, draftHydrated, refreshSession]);

  function goToStep(step: RegisterStep, updates?: Partial<RegisterDraft>) {
    const nextDraft: RegisterDraft = { ...draft, ...updates, step };
    setDraft(nextDraft);
    saveRegisterDraft(nextDraft);
    router.replace(getRegisterHref(step));
  }

  async function registerEmailAccount(nextDraft: RegisterDraft) {
    // Email registracija ide kroz browser (PKCE) `signUp` -- isti flow koji
    // /auth/callback (createServerClient, flowType: "pkce") ume da razmeni.
    // Samo browser signUp postavlja code_verifier u korisnikov cookie, tako da
    // confirmation link moze da se razmeni nakon klika.
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Backend nije dostupan.");
    }

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) {
      throw new Error("Origin nije dostupan.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: nextDraft.email.trim(),
      password: nextDraft.password ?? "",
      options: {
        emailRedirectTo: buildEmailVerifyCallbackUrl(origin),
        data: {
          display_name: `${nextDraft.firstName} ${nextDraft.lastName}`.trim(),
          role: "student",
        },
      },
    });

    if (error || !data.user?.id) {
      const message = error?.message ?? "Registracija nije uspela.";
      if (/already been registered|already exists|duplicate/i.test(message)) {
        throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
      }
      if (!message || message === "{}" || message.trim() === "") {
        throw new Error(
          "Nismo uspeli da vam pošaljemo mejl za potvrdu. Proverite konfiguraciju e-pošte ili pokušajte ponovo.",
        );
      }
      throw new Error(message);
    }

    await apiPost("/api/auth/register", {
      draft: nextDraft,
      authUserId: data.user.id,
    });

    return { userId: data.user.id };
  }

  async function registerAccount(nextDraft: RegisterDraft) {
    if (isClientBackendEnabled()) {
      if (nextDraft.authMethod !== "email") {
        await apiPost("/api/auth/register/oauth", { draft: nextDraft });
        return;
      }

      await registerEmailAccount(nextDraft);
      return;
    }

    const existingEmail = loadReferentCardsState().cards.some(
      (card) => card.email.toLowerCase() === nextDraft.email.trim().toLowerCase(),
    );
    if (existingEmail) {
      throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
    }

    syncRegisterDraftToSettings(nextDraft);
    createCardFromRegistration(nextDraft);
  }

  async function handleBasicContinue(updates: Partial<RegisterDraft>) {
    setEmailError(null);

    const email = (updates.email ?? draft.email).trim();
    try {
      await checkRegisterEmailAvailable(email);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : REGISTER_EMAIL_EXISTS_MESSAGE;
      setEmailError(message);
      return;
    }

    goToStep(2, updates);
  }

  async function handleOAuthContinue(updates: Partial<RegisterDraft>) {
    setEmailError(null);

    const email = (updates.email ?? draft.email).trim();
    try {
      await checkRegisterEmailAvailable(email);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : REGISTER_EMAIL_EXISTS_MESSAGE;
      setEmailError(message);
      return;
    }

    goToStep(2, updates);
  }

  async function handleVerifyEmailContinue(updates: Partial<RegisterDraft>) {
    setEmailError(null);
    goToStep(2, updates);
  }

  async function handleStudentContinue(updates: Partial<RegisterDraft>) {
    setCardNumberError(null);

    const nextDraft: RegisterDraft = { ...draft, ...updates, step: 2 };
    setDraft(nextDraft);
    saveRegisterDraft(nextDraft);

    const cardNumber = (updates.cardNumber ?? nextDraft.cardNumber).trim();

    try {
      await checkRegisterCardAvailable(cardNumber);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : REGISTER_CARD_EXISTS_MESSAGE;
      setCardNumberError(message);
      return;
    }

    try {
      await registerAccount(nextDraft);
      if (isClientBackendEnabled() && nextDraft.authMethod === "email") {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(EMAIL_ONBOARDING_PENDING_KEY, "1");
        }
        router.push(`/auth/verify-pending?email=${encodeURIComponent(nextDraft.email.trim())}`);
        return;
      }

      refreshSession();
      toast.success("Registracija uspešna");
      goToStep(3, updates);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Registracija nije uspela.";

      if (message === REGISTER_EMAIL_EXISTS_MESSAGE) {
        setEmailError(message);
        goToStep(1);
        return;
      }

      if (message === REGISTER_CARD_EXISTS_MESSAGE) {
        setCardNumberError(message);
        return;
      }

      toast.error(message || "Registracija nije uspela. Pokušajte ponovo.");
    }
  }

  async function finishOnboarding() {
    const destination = resolveStudentLandingPathSync({
      userId: readCachedStudentSession()?.userId,
      nextParam: null,
    });

    if (isClientBackendEnabled()) {
      try {
        const settings = await fetchUserSettingsFromApi();
        await saveUserSettingsViaApi({
          ...settings,
          account: {
            ...settings.account,
            registrationOnboardingCompleted: true,
          },
        });
        acknowledgeOnboardingComplete();
        await refreshSessionAsync();
      } catch {
        // Nastavi na dashboard čak i ako upis podešavanja ne uspe.
      }
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(EMAIL_ONBOARDING_PENDING_KEY);
    }

    clearRegisterDraft();
    markLandingPrefForApply();
    router.replace(destination);
  }

  function handleComplete() {
    void finishOnboarding();
  }

  function handleSkip() {
    void finishOnboarding();
  }

  if (isStep3AwaitingSession) {
    return null;
  }

  if (currentStep === 3) {
    return (
      <AiPreporukaShell
        backLabel="Nazad na podatke kartice"
        onBack={() => goToStep(2)}
        showBackLink
        step={3}
        subtitle="Izaberite omiljene namirnice po delovima obroka — doručak, ručak ili večera."
        title="Postavite omiljene namirnice"
      >
        <AiPreporukaContent
          onComplete={handleComplete}
          onSkip={handleSkip}
          variant="onboarding"
        />
      </AiPreporukaShell>
    );
  }

  return (
    <RegisterWizardShell currentStep={registerRoute === "potvrda" ? 1 : currentStep}>
      {registerRoute === "potvrda" ? (
        <RegisterVerifyEmailStep
          draft={draft}
          emailError={emailError}
          onBack={() => router.replace(getRegisterHref(1))}
          onConfirm={handleVerifyEmailContinue}
        />
      ) : currentStep === 1 ? (
        <RegisterBasicStep
          draft={draft}
          emailError={emailError}
          onClearEmailError={() => setEmailError(null)}
          onContinue={handleBasicContinue}
          onOAuthContinue={handleOAuthContinue}
        />
      ) : (
        <RegisterStudentStep
          cardNumberError={cardNumberError}
          draft={draft}
          onBack={() => goToStep(1)}
          onClearCardNumberError={() => setCardNumberError(null)}
          onContinue={handleStudentContinue}
        />
      )}
    </RegisterWizardShell>
  );
}

export function RegisterWizard() {
  return (
    <Suspense fallback={null}>
      <RegisterWizardInner />
    </Suspense>
  );
}

export default RegisterWizard;
