import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, GraduationCap, UtensilsCrossed } from "lucide-react";
import type { RegisterStep } from "@/lib/register-mock";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Meni",
    description: "Dnevna ponuda jela",
  },
  {
    icon: CreditCard,
    title: "Kartica",
    description: "Jedna kartica za sve",
  },
  {
    icon: GraduationCap,
    title: "Studenti",
    description: "Brza registracija",
  },
] as const;

const stepLabels: Record<RegisterStep, string> = {
  1: "1. Nalog",
  2: "2. Podaci kartice",
  3: "3. AI preferencije",
};

type RegisterWizardShellProps = {
  currentStep: RegisterStep;
  children: ReactNode;
  wideContent?: boolean;
};

function StepIndicator({ currentStep }: { currentStep: RegisterStep }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      {([1, 2, 3] as RegisterStep[]).map((step, index) => {
        const isActive = currentStep === step;
        const isComplete = currentStep > step;

        return (
          <span className="flex items-center gap-2" key={step}>
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
              {stepLabels[step]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function RegisterWizardShell({
  currentStep,
  children,
  wideContent = false,
}: RegisterWizardShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4 md:p-8">
      <section
        className={`flex w-full flex-col overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] md:flex-row ${
          wideContent ? "max-w-[1200px]" : "max-w-[1100px]"
        }`}
      >
        <aside className="relative hidden overflow-hidden bg-[#5055D2] p-10 md:flex md:w-[45%] md:flex-col md:justify-between lg:p-12">
          <div className="relative z-10">
            <Link className="text-3xl font-extrabold tracking-tighter text-white lg:text-4xl" href="/">
              eMenza
            </Link>
          </div>

          <div className="relative z-10 mt-auto space-y-8">
            <div>
              <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                Svi obroci na{" "}
                <span className="text-white/90">jednom mestu.</span>
              </h1>
              <p className="max-w-sm text-sm font-light leading-relaxed text-white/80 lg:text-base">
                Pronađite menze, proverite stanje na kartici i rezervišite omiljeno jelo u par
                klikova.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                    key={feature.title}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon aria-hidden="true" className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        {feature.title}
                      </p>
                      <p className="text-sm font-semibold text-white">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              {([1, 2, 3] as RegisterStep[]).map((step) => (
                <div
                  className={`h-1 rounded-full transition-all ${
                    currentStep === step ? "w-12 bg-white" : "w-4 bg-white/35"
                  }`}
                  key={step}
                />
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 right-10 size-32 rounded-full bg-white/10"
          />
        </aside>

        <section
          className={`flex w-full flex-col bg-white ${
            wideContent ? "md:w-full" : "justify-center md:w-[55%]"
          }`}
        >
          <div className={`flex flex-1 flex-col ${wideContent ? "p-6 md:p-8 lg:p-10" : "justify-center p-8 md:p-10 lg:p-12"}`}>
            <div className="mb-6">{currentStep < 3 ? <StepIndicator currentStep={currentStep} /> : null}</div>
            {children}
          </div>

          {currentStep < 3 ? (
            <footer className="border-t border-black/5 px-8 pb-8 pt-6 md:px-10 lg:px-12">
              <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                  © 2026 eMenza. Sva prava zadržana.
                </p>
                <div className="flex gap-5">
                  <Link
                    className="text-xs font-semibold uppercase tracking-wide text-black/40 transition-colors hover:text-[#5055D2]"
                    href="/pomoc"
                  >
                    Politika privatnosti
                  </Link>
                  <Link
                    className="text-xs font-semibold uppercase tracking-wide text-black/40 transition-colors hover:text-[#5055D2]"
                    href="/pomoc"
                  >
                    Pomoć
                  </Link>
                </div>
              </div>
            </footer>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default RegisterWizardShell;
