"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { staffButtonPrimaryClass, staffInputClass, staffLabelClass } from "@/components/staff/StaffFormSection";

export type StaffLoginConfig = {
  panelLabel: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  submitIcon: LucideIcon;
  benefits: string[];
  gradientClass?: string;
  onLogin: (email: string, password: string) => boolean | Promise<boolean>;
  redirectTo: string;
  disableRedirect?: boolean;
};

export function StaffLoginPage({
  panelLabel,
  title,
  subtitle,
  icon: Icon,
  submitIcon: SubmitIcon,
  benefits,
  gradientClass = "from-[#1F2937] via-[#5055D2] to-[#6368e0]",
  onLogin,
  redirectTo,
  disableRedirect = false,
}: StaffLoginConfig) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const success = await onLogin(email, password);
    setIsSubmitting(false);
    if (!success) {
      setError("Pogrešan email ili lozinka.");
      return;
    }
    if (disableRedirect) {
      return;
    }
    router.refresh();
    router.push(redirectTo);
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <div
        className={`relative hidden w-[45%] flex-col justify-between bg-gradient-to-br ${gradientClass} p-10 text-white lg:flex xl:p-14`}
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">eMenza</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight">{panelLabel}</h1>
          <p className="mt-4 max-w-md text-base text-white/80">{subtitle}</p>
        </div>
        <ul className="space-y-3">
          {benefits.map((benefit) => (
            <li className="flex items-start gap-3 text-sm text-white/90" key={benefit}>
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#5055D2]/10">
              <Icon aria-hidden="true" className="text-[#5055D2]" size={24} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                eMenza · {panelLabel}
              </p>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
            </div>
          </div>

          <div className="staff-card p-6 sm:p-8">
            <div className="mb-6 hidden lg:block">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Unesite pristupne podatke za nastavak.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className={staffLabelClass} htmlFor="staff-login-email">
                  Email
                </label>
                <input
                  autoComplete="username"
                  className={staffInputClass}
                  id="staff-login-email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>
              <div>
                <label className={staffLabelClass} htmlFor="staff-login-password">
                  Lozinka
                </label>
                <input
                  autoComplete="current-password"
                  className={staffInputClass}
                  id="staff-login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <button className={`${staffButtonPrimaryClass} w-full`} disabled={isSubmitting} type="submit">
                <SubmitIcon aria-hidden="true" size={16} />
                {isSubmitting ? "Prijava..." : "Prijavi se"}
              </button>
            </form>
          </div>

          <Link
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5055D2] hover:underline"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Nazad na studentski portal
          </Link>
        </div>
      </div>
    </div>
  );
}
