"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { isClerkEnabledClient } from "@/lib/clerk-config";
import { getRegisterVerifyHref, isRegisterOnboardingPath } from "@/lib/register-mock";
import { resolveStudentLandingPathSync, markLandingPrefForApply } from "@/lib/app-preferences";
import { isStudentAuthPath, isStudentProtectedPath } from "@/lib/student-routes";
import { useStudentSessionContext } from "@/contexts/StudentSessionProvider";

const REGISTER_STEP_3_HREF = "/register?korak=3";

export function StudentAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clerkEnabled = isClerkEnabledClient();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const {
    isSessionValidated,
    isAuthenticated,
    isDemo,
    session,
    sessionStatus,
    onboardingPending,
  } = useStudentSessionContext();

  useLayoutEffect(() => {
    if (!isSessionValidated || isDemo) {
      return;
    }

    const korak =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("korak")
        : null;

    if (isAuthenticated && onboardingPending) {
      if (pathname.startsWith("/register")) {
        if (korak === "3") {
          return;
        }

        router.replace(REGISTER_STEP_3_HREF);
        return;
      }

      if (isStudentProtectedPath(pathname)) {
        router.replace(REGISTER_STEP_3_HREF);
        return;
      }

      return;
    }

    if (!clerkEnabled || !clerkLoaded) {
      return;
    }

    if (isAuthenticated && pathname.startsWith("/register")) {
      if (isRegisterOnboardingPath(pathname, korak)) {
        return;
      }

      markLandingPrefForApply();
      router.replace(
        resolveStudentLandingPathSync({
          userId: session?.userId,
          nextParam: null,
        }),
      );
      return;
    }

    if (!isSignedIn || isAuthenticated) {
      return;
    }

    if (sessionStatus !== "oauth_pending") {
      return;
    }

    if (isStudentProtectedPath(pathname) && !isStudentAuthPath(pathname)) {
      router.replace(getRegisterVerifyHref());
    }
  }, [
    clerkEnabled,
    clerkLoaded,
    isAuthenticated,
    isDemo,
    isSessionValidated,
    isSignedIn,
    onboardingPending,
    pathname,
    router,
    session?.userId,
    sessionStatus,
  ]);

  return children;
}
