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
  const { isLoaded: clerkLoaded } = useAuth();
  const {
    isSessionValidated,
    isAuthenticated,
    isDemo,
    isLoggingOut,
    session,
    sessionStatus,
    onboardingPending,
    usesBackend,
  } = useStudentSessionContext();

  useLayoutEffect(() => {
    if (!isSessionValidated || isDemo || !usesBackend || isLoggingOut) {
      return;
    }

    const isProtectedGuestPath =
      !isAuthenticated && isStudentProtectedPath(pathname) && !isStudentAuthPath(pathname);

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

    if (isProtectedGuestPath) {
      if (sessionStatus === "guest" || sessionStatus === "error") {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (sessionStatus === "oauth_pending") {
        router.replace(getRegisterVerifyHref());
        return;
      }
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
  }, [
    clerkEnabled,
    clerkLoaded,
    isAuthenticated,
    isDemo,
    isLoggingOut,
    isSessionValidated,
    onboardingPending,
    pathname,
    router,
    session?.userId,
    sessionStatus,
    usesBackend,
  ]);

  return children;
}
