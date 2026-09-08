"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useStudentSession } from "@/hooks/useStudentSession";
import {
  consumeLandingPrefApplyFlag,
  hasLandingPrefApplyFlag,
  resolveStudentLandingPathSync,
} from "@/lib/app-preferences";
import { isClientBackendEnabled } from "@/lib/backend-config";

function applyDocumentLanguage(language: "sr" | "en") {
  document.documentElement.lang = language === "en" ? "en" : "sr-Latn";
  document.documentElement.dataset.appLanguage = language;
}

export function AppPreferencesRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, isLoaded, isRemoteHydrated } = useUserSettings();
  const { isAuthenticated, isReady, isLoggingOut, session } = useStudentSession();
  const backend = isClientBackendEnabled();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    applyDocumentLanguage(settings.app.language);
  }, [isLoaded, settings.app.language]);

  useEffect(() => {
    if (!isReady || isLoggingOut || !isAuthenticated || !session) {
      return;
    }

    if (!hasLandingPrefApplyFlag()) {
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (backend && !isRemoteHydrated) {
      return;
    }

    consumeLandingPrefApplyFlag();

    const path = resolveStudentLandingPathSync({
      userId: session.userId,
      nextParam: null,
    });
    if (pathname !== path) {
      router.replace(path);
    }
  }, [
    backend,
    isAuthenticated,
    isLoaded,
    isLoggingOut,
    isReady,
    isRemoteHydrated,
    pathname,
    router,
    session,
    settings.app.defaultLandingPage,
  ]);

  return null;
}
