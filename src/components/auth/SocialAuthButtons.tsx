"use client";

import { Apple } from "lucide-react";
import { ClerkOAuthButton } from "@/components/auth/ClerkOAuthButton";
import { isClerkGoogleOAuthConfigured } from "@/lib/student-oauth";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 transition-transform group-hover:scale-110"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return <Apple aria-hidden="true" className="size-5 transition-transform group-hover:scale-110" strokeWidth={2} />;
}

type SocialAuthButtonsProps = {
  onGoogleClick?: () => void;
  onAppleClick?: () => void;
  onGoogleError?: (message: string) => void;
  onAppleError?: (message: string) => void;
  onBeforeOAuth?: () => boolean;
  disabled?: boolean;
  forceAccountPicker?: boolean;
  oauthIntent?: "signIn" | "signUp";
  oauthRedirectPath?: string;
  variant?: "dark" | "light";
};

export function SocialAuthButtons({
  onGoogleClick,
  onAppleClick,
  onGoogleError,
  onAppleError,
  onBeforeOAuth,
  disabled = false,
  forceAccountPicker = false,
  oauthIntent = "signIn",
  oauthRedirectPath = "/",
  variant = "dark",
}: SocialAuthButtonsProps) {
  const buttonClassName =
    variant === "light"
      ? "group flex w-full items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-black/75 transition-colors hover:border-[#5055D2]/25 hover:bg-[#5055D2]/5 disabled:cursor-not-allowed disabled:opacity-50"
      : "group flex w-full items-center justify-center gap-2 rounded-lg border border-accent-border bg-transparent px-4 py-3 font-mono text-sm font-medium text-white transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50";

  const useClerkOAuth = isClerkGoogleOAuthConfigured();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
      {useClerkOAuth ? (
        <ClerkOAuthButton
          className={buttonClassName}
          disabled={disabled}
          forceAccountPicker={forceAccountPicker}
          intent={oauthIntent}
          onBeforeClick={onBeforeOAuth}
          onError={onGoogleError}
          redirectPath={oauthRedirectPath}
          strategy="oauth_google"
        >
          <GoogleIcon />
          Google
        </ClerkOAuthButton>
      ) : (
        <button
          className={buttonClassName}
          disabled={disabled}
          onClick={onGoogleClick}
          type="button"
        >
          <GoogleIcon />
          Google
        </button>
      )}
      {useClerkOAuth ? (
        <ClerkOAuthButton
          className={buttonClassName}
          disabled={disabled}
          forceAccountPicker={forceAccountPicker}
          intent={oauthIntent}
          onBeforeClick={onBeforeOAuth}
          onError={onAppleError ?? onGoogleError}
          redirectPath={oauthRedirectPath}
          strategy="oauth_apple"
        >
          <AppleIcon />
          Apple
        </ClerkOAuthButton>
      ) : (
        <button
          className={buttonClassName}
          disabled={disabled}
          onClick={onAppleClick}
          type="button"
        >
          <AppleIcon />
          Apple
        </button>
      )}
    </div>
    </div>
  );
}
