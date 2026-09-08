"use client";

import { useAuth } from "@clerk/nextjs";
import { useStudentSession } from "@/hooks/useStudentSession";
import { isClerkEnabledClient } from "@/lib/clerk-config";

export function useClerkManagedStudentAuth() {
  const { session, usesBackend, isAuthenticated, isDemo } = useStudentSession();
  const clerkEnabled = isClerkEnabledClient();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();

  if (!usesBackend || !isAuthenticated || isDemo) {
    return false;
  }

  if (session?.canChangePassword === true) {
    return false;
  }

  if (session?.canChangePassword === false) {
    return true;
  }

  if (session?.authProvider === "password") {
    return false;
  }

  if (session?.authProvider === "oauth") {
    return true;
  }

  return Boolean(clerkEnabled && clerkLoaded && isSignedIn);
}
