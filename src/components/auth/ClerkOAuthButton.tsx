"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  useStudentSessionContext,
  type SessionSnapshot,
} from "@/contexts/StudentSessionProvider";
import { getRegisterHref, getRegisterVerifyHref } from "@/lib/register-mock";
import { markLandingPrefForApply, resolveStudentLandingPathSync } from "@/lib/app-preferences";

type ClerkOAuthStrategy = "oauth_google" | "oauth_apple";
type ClerkOAuthIntent = "signIn" | "signUp";

type ClerkOAuthButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  forceAccountPicker?: boolean;
  intent?: ClerkOAuthIntent;
  onError?: (message: string) => void;
  onBeforeClick?: () => boolean;
  redirectPath?: string;
  strategy: ClerkOAuthStrategy;
};

function normalizePath(path: string) {
  const [pathname, search = ""] = path.split("?");
  return search ? `${pathname}?${search}` : pathname;
}

export function ClerkOAuthButton({
  children,
  className,
  disabled = false,
  forceAccountPicker = false,
  intent = "signIn",
  onError,
  onBeforeClick,
  redirectPath = "/",
  strategy,
}: ClerkOAuthButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const {
    refreshSessionAsync,
    isSessionValidated,
    sessionStatus,
    sessionError,
    session,
    oauthPendingUser,
    onboardingPending,
  } = useStudentSessionContext();
  const [isResolvingSession, setIsResolvingSession] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const isReady = isLoaded && fetchStatus === "idle" && Boolean(signIn);
  const isBusy = disabled || isResolvingSession || isInitiating;

  function routeFromSnapshot(snapshot: SessionSnapshot) {
    const status = snapshot.sessionStatus;

    if (status === "student") {
      if (snapshot.onboardingPending) {
        const onboardingPath = getRegisterHref(3);
        if (normalizePath(pathname) !== normalizePath(onboardingPath)) {
          router.replace(onboardingPath);
        }
        return;
      }

      markLandingPrefForApply();
      const destination = resolveStudentLandingPathSync({
        userId: snapshot.session?.userId,
        nextParam: redirectPath !== "/" ? redirectPath : null,
      });
      if (normalizePath(pathname) !== normalizePath(destination)) {
        router.replace(destination);
      }
      return;
    }

    if (status === "oauth_pending") {
      const onboardingPath = getRegisterVerifyHref();
      if (normalizePath(pathname) !== normalizePath(onboardingPath)) {
        router.replace(onboardingPath);
      }
      return;
    }

    if (status === "error") {
      onError?.(snapshot.sessionError ?? "Učitavanje podataka naloga nije uspelo.");
      return;
    }

    markLandingPrefForApply();
    const fallbackDestination = resolveStudentLandingPathSync({
      nextParam: redirectPath !== "/" ? redirectPath : null,
    });
    if (normalizePath(pathname) !== normalizePath(fallbackDestination)) {
      router.replace(fallbackDestination);
    }
  }

  async function routeSignedInUser() {
    if (isSessionValidated && sessionStatus !== "loading") {
      routeFromSnapshot({
        sessionStatus,
        sessionError,
        session,
        oauthPendingUser,
        isSessionValidated,
        onboardingPending,
      });
      return;
    }

    setIsResolvingSession(true);

    try {
      const snapshot = await refreshSessionAsync();
      routeFromSnapshot(snapshot);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Učitavanje podataka naloga nije uspelo.",
      );
    } finally {
      setIsResolvingSession(false);
    }
  }

  async function handleClick() {
    if (disabled || isResolvingSession || isInitiating) {
      return;
    }

    if (!isReady || !signIn) {
      onError?.("OAuth se još učitava. Sačekajte trenutak i pokušajte ponovo.");
      return;
    }

    if (onBeforeClick && !onBeforeClick()) {
      return;
    }

    const origin = window.location.origin;
    const destination = `${origin}${redirectPath}`;

    setIsInitiating(true);
    try {
      if (isSignedIn) {
        await routeSignedInUser();
        return;
      }

      markLandingPrefForApply();

      // Reset eventuelnog "zaglavljenog" (pending) naloga iz prethodnog pokušaja.
      // Bez toga Clerk (Core 3 / #SDK-75) ponovo koristi stari OAuth resource i
      // sledeći klik tiho ne radi ništa.
      try {
        await signIn.reset();
      } catch {
        // reset je lokalna opcija — ignoriši ako nije podržana.
      }

      const { error } = await signIn.sso({
        strategy,
        redirectUrl: destination,
        redirectCallbackUrl: `${origin}/sso-callback?intent=${intent}`,
        oidcPrompt:
          forceAccountPicker && strategy === "oauth_google" ? "select_account" : undefined,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Clerk na "pravi" (korisnički) klik otvara popup prozor koji kod nas
      // ostaje zaglavljen (blob URL) i nikad ne vodi do Google-a. Zato
      // forsiraj top-level redirect na OAuth URL.
      const oauthUrl = signIn.firstFactorVerification?.externalVerificationRedirectURL;
      if (oauthUrl) {
        window.location.assign(oauthUrl.toString());
        return;
      }

      // Ako sso() nije formirao OAuth URL (npr. provajder nije spreman na
      // Clerk strani), prikaži jasnu poruku umesto tihog ništa-ne-radi.
      const providerLabel = strategy === "oauth_google" ? "Google" : "Apple";
      const firstFactor = signIn.firstFactorVerification;
      const debug = [
        `status=${signIn.status ?? "unknown"}`,
        `verification=${firstFactor?.status ?? "none"}`,
        `supportedFirstFactors=${(signIn.supportedFirstFactors ?? [])
          .map((f) => (f as { strategy?: string }).strategy)
          .join(",") || "none"}`,
      ].join(" · ");
      throw new Error(
        `Prijava putem ${providerLabel}-a se nije pokrenula. Detalji: ${debug}. Proveri da je provajder omogućen i ispravno povezan u Clerk podešavanjima, pa pokušaj ponovo.`,
      );
    } catch (error) {
      const providerLabel = strategy === "oauth_google" ? "Google" : "Apple";
      onError?.(
        error instanceof Error
          ? error.message
          : `Prijava putem ${providerLabel}-a nije uspela.`,
      );
    } finally {
      setIsInitiating(false);
    }
  }

  const showLoadingLabel =
    isResolvingSession ||
    isInitiating ||
    (!isReady && isLoaded) ||
    (isSignedIn && sessionStatus === "loading");

  return (
    <button
      className={className}
      disabled={isBusy || !isReady}
      onClick={() => void handleClick()}
      type="button"
    >
      {showLoadingLabel ? "Učitavanje..." : children}
    </button>
  );
}

export async function clerkSignOutForAccountSwitch() {
  const clerk = (
    window as Window & {
      Clerk?: { signOut: (opts?: { redirectUrl?: string }) => Promise<void> };
    }
  ).Clerk;

  await clerk?.signOut();
}
