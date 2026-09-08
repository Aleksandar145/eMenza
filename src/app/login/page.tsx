import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Utensils, Wallet } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

const features = [
  {
    icon: Utensils,
    title: "Brzi pristup",
    description: "Skeniraj i jedi",
  },
  {
    icon: Wallet,
    title: "Uplate",
    description: "Trenutna dopuna",
  },
  {
    icon: CalendarDays,
    title: "Rezervacije",
    description: "Planiraj celu nedelju",
  },
] as const;

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFF1F4] p-4 md:p-8">
      <section className="flex w-full max-w-[1100px] flex-col overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] md:flex-row">
        <aside className="relative hidden overflow-hidden bg-[#5055D2] p-10 md:flex md:w-[45%] md:flex-col md:justify-between lg:p-12">
          <div className="relative z-10">
            <Link className="text-3xl font-extrabold tracking-tighter text-white lg:text-4xl" href="/">
              eMenza
            </Link>
          </div>

          <div className="relative z-10 mt-auto space-y-8">
            <div>
              <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                Digitalno iskustvo studentske ishrane.
              </h1>
              <p className="max-w-sm text-sm font-light leading-relaxed text-white/80 lg:text-base">
                Upravljajte obrocima, proverite stanje na kartici i planirajte nedelju uz
                platformu dizajniranu za modernog studenta.
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
              <div className="h-1 w-12 rounded-full bg-white" />
              <div className="h-1 w-4 rounded-full bg-white/35" />
              <div className="h-1 w-4 rounded-full bg-white/35" />
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

        <section className="flex w-full flex-col justify-center bg-white p-8 md:w-[55%] md:p-12 lg:p-16">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <footer className="mt-10 border-t border-black/5 pt-6">
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
        </section>
      </section>
    </main>
  );
}
