"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { buildEmailVerifyCallbackUrl } from "@/lib/auth-email-verify";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { useT } from "@/i18n/useT";

function VerifyPendingInner() {
  const searchParams = useSearchParams();
  const { t } = useT();
  const email = searchParams.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const backend = isClientBackendEnabled();

  async function handleResend() {
    if (!email || !backend) {
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Auth nije dostupan.");
      }

      const redirectTo = buildEmailVerifyCallbackUrl(window.location.origin);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        throw error;
      }

      setMessage(t("auth.verifyPending.resendSuccess"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("auth.verifyPending.resendFailed"),
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4">
      <section className="w-full max-w-lg rounded-[20px] border border-black/5 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-black">{t("auth.verifyPending.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          {t("auth.verifyPending.introPrefix")}{" "}
          <span className="font-semibold text-black">
            {email || t("auth.verifyPending.emailFallback")}
          </span>
          {t("auth.verifyPending.introSuffix")}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            className="rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            disabled={!email || isSending || !backend}
            onClick={() => void handleResend()}
            type="button"
          >
            {isSending ? t("auth.verifyPending.sending") : t("auth.verifyPending.resend")}
          </button>
          <Link
            className="text-center text-sm font-semibold text-[#5055D2] hover:underline"
            href="/login"
          >
            {t("auth.verifyPending.backToLogin")}
          </Link>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-[#5055D2]/5 px-3 py-2 text-sm text-[#5055D2]" role="status">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function VerifyPendingPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPendingInner />
    </Suspense>
  );
}
