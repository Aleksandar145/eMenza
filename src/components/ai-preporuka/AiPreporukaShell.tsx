"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AiPreporukaShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  step?: 1 | 2 | 3;
  showBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
};

const stepLabels: Record<1 | 2 | 3, string> = {
  1: "1. Nalog",
  2: "2. Podaci kartice",
  3: "3. AI preferencije",
};

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      {([1, 2, 3] as const).map((entry, index) => {
        const isActive = step === entry;
        const isComplete = step > entry;

        return (
          <span className="flex items-center gap-2" key={entry}>
            {index > 0 ? <span className="text-black/25">→</span> : null}
            <span
              className={`rounded-full px-3 py-1 ${
                isActive
                  ? "bg-[#5055D2] text-white"
                  : isComplete
                    ? "bg-[#5055D2]/10 text-[#5055D2]"
                    : "bg-[#EFF1F4] text-black/45"
              }`}
            >
              {stepLabels[entry]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function AiPreporukaShell({
  title,
  subtitle,
  children,
  step,
  showBackLink = false,
  backHref = "/",
  backLabel = "Nazad na početnu",
  onBack,
}: AiPreporukaShellProps) {
  return (
    <main className="min-h-screen bg-[#EFF1F4]">
      <header className="border-b border-black/5 bg-white px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link className="text-2xl font-extrabold tracking-tighter text-[#5055D2] lg:text-3xl" href="/">
            eMenza
          </Link>
          {step ? <StepIndicator step={step} /> : null}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {showBackLink ? (
          onBack ? (
            <button
              className="mb-4 inline-flex text-sm font-semibold text-[#5055D2] transition-colors hover:underline"
              onClick={onBack}
              type="button"
            >
              ← {backLabel}
            </button>
          ) : (
            <Link
              className="mb-4 inline-flex text-sm font-semibold text-[#5055D2] transition-colors hover:underline"
              href={backHref}
            >
              ← {backLabel}
            </Link>
          )
        ) : null}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black lg:text-3xl">{title}</h1>
          <p className="mt-2 text-sm font-light leading-relaxed text-black/55 lg:text-base">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </main>
  );
}
