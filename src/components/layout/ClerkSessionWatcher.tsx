"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { readCachedStudentSession } from "@/contexts/StudentSessionProvider";
import { markLandingPrefForApply } from "@/lib/app-preferences";

export function ClerkSessionWatcher() {
  const { isLoaded, isSignedIn } = useUser();
  const previousSignedInRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (previousSignedInRef.current === null) {
      previousSignedInRef.current = isSignedIn;
      if (isSignedIn && !readCachedStudentSession()) {
        window.dispatchEvent(
          new CustomEvent("emenza-clerk-auth-change", {
            detail: { isSignedIn },
          }),
        );
      }
      return;
    }

    if (previousSignedInRef.current === isSignedIn) {
      return;
    }

    previousSignedInRef.current = isSignedIn;

    if (isSignedIn) {
      markLandingPrefForApply();
    }

    window.dispatchEvent(
      new CustomEvent("emenza-clerk-auth-change", {
        detail: { isSignedIn },
      }),
    );
  }, [isLoaded, isSignedIn]);

  return null;
}
