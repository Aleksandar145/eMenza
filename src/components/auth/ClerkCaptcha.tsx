"use client";

import { isClerkEnabledClient } from "@/lib/clerk-config";

/** Global mount point for Clerk Smart CAPTCHA (bot sign-up protection on custom OAuth flows). */
export function ClerkCaptcha() {
  if (!isClerkEnabledClient()) {
    return null;
  }

  return <div id="clerk-captcha" />;
}
