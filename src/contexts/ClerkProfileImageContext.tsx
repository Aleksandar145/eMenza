"use client";

import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const CLERK_AVATAR_CACHE_KEY = "emenza-clerk-avatar";

const ClerkProfileImageContext = createContext<string | undefined>(undefined);

function readCachedClerkAvatarUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return sessionStorage.getItem(CLERK_AVATAR_CACHE_KEY)?.trim() || undefined;
}

export function ClerkProfileImageProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const liveUrl = isLoaded && isSignedIn ? user?.imageUrl?.trim() : undefined;
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(readCachedClerkAvatarUrl);

  useEffect(() => {
    if (liveUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCachedUrl(liveUrl);
      sessionStorage.setItem(CLERK_AVATAR_CACHE_KEY, liveUrl);
      return;
    }

    if (isLoaded && !isSignedIn) {
      setCachedUrl(undefined);
      sessionStorage.removeItem(CLERK_AVATAR_CACHE_KEY);
    }
  }, [isLoaded, isSignedIn, liveUrl]);

  const imageUrl = liveUrl || cachedUrl;

  return (
    <ClerkProfileImageContext.Provider value={imageUrl}>
      {children}
    </ClerkProfileImageContext.Provider>
  );
}

export function clearCachedClerkAvatarUrl() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(CLERK_AVATAR_CACHE_KEY);
}

export function useClerkProfileImageUrl() {
  return useContext(ClerkProfileImageContext);
}