"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const backend = isClientBackendEnabled();

  useEffect(() => {
    async function prepareSession() {
      if (!backend) {
        setIsReady(true);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setIsReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasRecoverySession(Boolean(session));
      setIsReady(true);
    }

    void prepareSession();
  }, [backend]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.resetPasswordPage.passwordMinLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.resetPasswordPage.passwordMismatch"));
      return;
    }

    if (!backend) {
      setError(t("auth.resetPasswordPage.backendRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(t("auth.resetPasswordPage.backendRequired"));
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      router.replace("/login");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("auth.resetPasswordPage.updateFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return null;
  }

  if (backend && !hasRecoverySession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4">
        <section className="w-full max-w-lg rounded-[20px] border border-black/5 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h1 className="text-2xl font-bold text-black">{t("auth.resetPasswordPage.title")}</h1>
          <p className="mt-3 text-sm text-red-700">{t("auth.resetPasswordPage.linkInvalid")}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              href="/auth/forgot-password"
            >
              {t("auth.resetPasswordPage.requestNewLink")}
            </Link>
            <Link
              className="text-center text-sm font-semibold text-[#5055D2] hover:underline"
              href="/login"
            >
              {t("auth.resetPasswordPage.backToLogin")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4">
      <section className="w-full max-w-lg rounded-[20px] border border-black/5 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-black">{t("auth.resetPasswordPage.title")}</h1>
        <p className="mt-3 text-sm text-black/60">{t("auth.resetPasswordPage.description")}</p>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-black/45"
              htmlFor="password"
            >
              {t("auth.resetPasswordPage.newPasswordLabel")}
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-black/45"
              htmlFor="confirm-password"
            >
              {t("auth.resetPasswordPage.confirmPasswordLabel")}
            </label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
              id="confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </div>

          <button
            className="w-full rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? t("auth.resetPasswordPage.savingPassword")
              : t("auth.resetPasswordPage.savePassword")}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <Link
          className="mt-6 inline-block text-sm font-semibold text-[#5055D2] hover:underline"
          href="/login"
        >
          {t("auth.resetPasswordPage.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
