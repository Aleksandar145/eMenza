"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useT } from "@/i18n/useT";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { requestPasswordResetEmail } from "@/lib/password-reset";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const backend = isClientBackendEnabled();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError(t("auth.forgotPasswordPage.emailRequired"));
      return;
    }

    if (!backend) {
      setError(t("auth.forgotPasswordPage.backendRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: resetError } = await requestPasswordResetEmail(email);
      if (resetError) {
        throw resetError;
      }

      setMessage(t("auth.forgotPasswordPage.resetLinkSent"));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("auth.forgotPasswordPage.resetLinkFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4">
      <section className="w-full max-w-lg rounded-[20px] border border-black/5 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-black">{t("auth.forgotPasswordPage.title")}</h1>
        <p className="mt-3 text-sm text-black/60">{t("auth.forgotPasswordPage.description")}</p>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-black/45"
              htmlFor="email"
            >
              {t("auth.forgotPasswordPage.emailLabel")}
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.forgotPasswordPage.emailPlaceholder")}
              type="email"
              value={email}
            />
          </div>

          <button
            className="w-full rounded-full bg-[#5055D2] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? t("auth.forgotPasswordPage.sendingResetLink")
              : t("auth.forgotPasswordPage.sendResetLink")}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl bg-[#5055D2]/5 px-3 py-2 text-sm text-[#5055D2]" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <Link
          className="mt-6 inline-block text-sm font-semibold text-[#5055D2] hover:underline"
          href="/login"
        >
          {t("auth.forgotPasswordPage.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
