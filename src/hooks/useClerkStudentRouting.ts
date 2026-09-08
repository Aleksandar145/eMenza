"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { isClerkEnabledClient } from "@/lib/clerk-config";
import { useStudentSession } from "@/hooks/useStudentSession";

type UseClerkStudentRoutingOptions = {
  enabled?: boolean;
  onboardingPath?: string;
  homePath?: string;
  resolveHomePath?: () => string;
  resolveHomePathAsync?: () => Promise<string>;
  /** Na /login ne šalji korisnika na registraciju — samo na dashboard ako već ima studentski profil. */
  skipOnboardingRedirect?: boolean;
  /** Posle eksplicitne odjave ne pokušavaj ponovno učitavanje sesije niti redirect. */
  suppressAutoRouting?: boolean;
};

export function useClerkStudentRouting(options?: UseClerkStudentRoutingOptions) {
  const router = useRouter();
  const clerkEnabled = isClerkEnabledClient();
  const enabled = options?.enabled ?? true;
  const onboardingPath = options?.onboardingPath ?? "/register?korak=potvrda";
  const homePath = options?.homePath ?? "/";
  const resolveHomePath = options?.resolveHomePath;
  const resolveHomePathAsync = options?.resolveHomePathAsync;
  const skipOnboardingRedirect = options?.skipOnboardingRedirect ?? false;
  const suppressAutoRouting = options?.suppressAutoRouting ?? false;
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { isAuthenticated, isSessionValidated, sessionStatus, refreshSession, isLoggingOut } =
    useStudentSession();
  const oauthSessionRetryRef = useRef(false);
  const landingRedirectRef = useRef(false);

  useEffect(() => {
    if (
      !enabled ||
      suppressAutoRouting ||
      isLoggingOut ||
      !clerkEnabled ||
      !clerkLoaded ||
      !isSignedIn ||
      !isSessionValidated
    ) {
      return;
    }

    if (isAuthenticated || sessionStatus === "student" || sessionStatus === "oauth_pending") {
      oauthSessionRetryRef.current = false;
      return;
    }

    if (sessionStatus === "loading" || oauthSessionRetryRef.current) {
      return;
    }

    oauthSessionRetryRef.current = true;
    refreshSession();
  }, [
    clerkEnabled,
    clerkLoaded,
    enabled,
    isAuthenticated,
    isLoggingOut,
    isSessionValidated,
    isSignedIn,
    refreshSession,
    sessionStatus,
    suppressAutoRouting,
  ]);

  useEffect(() => {
    if (
      !enabled ||
      suppressAutoRouting ||
      isLoggingOut ||
      !clerkEnabled ||
      !clerkLoaded ||
      !isSessionValidated
    ) {
      landingRedirectRef.current = false;
      return;
    }

    if (isAuthenticated || sessionStatus === "student") {
      if (landingRedirectRef.current) {
        return;
      }

      landingRedirectRef.current = true;

      void (async () => {
        const destination = resolveHomePathAsync
          ? await resolveHomePathAsync()
          : (resolveHomePath?.() ?? homePath);
        router.replace(destination);
      })();

      return;
    }

    landingRedirectRef.current = false;

    if (!isSignedIn || sessionStatus === "loading" || sessionStatus === "error") {
      return;
    }

    if (sessionStatus === "oauth_pending" && !skipOnboardingRedirect) {
      router.replace(onboardingPath);
    }
  }, [
    clerkEnabled,
    clerkLoaded,
    enabled,
    homePath,
    isAuthenticated,
    isLoggingOut,
    isSessionValidated,
    isSignedIn,
    onboardingPath,
    resolveHomePath,
    resolveHomePathAsync,
    router,
    sessionStatus,
    skipOnboardingRedirect,
    suppressAutoRouting,
  ]);
}
