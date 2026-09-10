"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { HelpContactCard } from "@/components/pomoc/HelpContactCard";
import { HelpFaqList } from "@/components/pomoc/HelpFaqList";
import { HelpSectionCard } from "@/components/pomoc/HelpSectionCard";
import { HelpWorkingHoursTable } from "@/components/pomoc/HelpWorkingHoursTable";
import { useStudentSession } from "@/hooks/useStudentSession";
import {
  helpContact,
  helpFaq,
  helpIntro,
  helpSections,
} from "@/lib/pomoc-mock";

function HelpContent() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-black/5 bg-[#EFF1F4] p-5 lg:p-6">
        <h2 className="text-xl font-bold text-black lg:text-2xl">{helpIntro.title}</h2>
        <p className="mt-2 text-sm font-light leading-relaxed text-black/65 lg:text-base">
          {helpIntro.description}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-black lg:text-xl">Vodič kroz aplikaciju</h2>
        <div className="space-y-4">
          {helpSections.map((section) => (
            <HelpSectionCard key={section.id} section={section} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-black lg:text-xl">Česta pitanja</h2>
        <HelpFaqList items={helpFaq} />
      </section>

      <HelpWorkingHoursTable />

      <HelpContactCard contact={helpContact} />
    </div>
  );
}

function PublicPomocShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#EFF1F4] font-sans text-[#1F2937]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#EFF1F4]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 lg:px-0">
          <Link className="text-2xl font-extrabold tracking-tighter text-[#5055D2]" href="/">
            eMenza
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-full px-4 py-2 text-sm font-semibold text-black/70 transition-colors hover:bg-black/5"
              href="/login"
            >
              Prijava
            </Link>
            <Link
              className="rounded-full bg-[#5055D2] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90"
              href="/register"
            >
              Registracija
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 lg:px-0 lg:py-14">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-black lg:text-4xl">Pomoć</h1>
          <p className="text-sm font-light leading-relaxed text-black/55 lg:text-base">
            Kako koristiti eMenza portal
          </p>
        </div>
        {children}
      </div>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-6 text-center lg:px-0 md:flex-row md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
            © 2026 eMenza. Sva prava zadržana.
          </p>
          <Link
            className="text-xs font-semibold uppercase tracking-wide text-black/40 transition-colors hover:text-[#5055D2]"
            href="/pomoc"
          >
            Politika privatnosti
          </Link>
        </div>
      </footer>
    </main>
  );
}

export function PomocPage() {
  const { isAuthenticated } = useStudentSession();

  if (isAuthenticated) {
    return (
      <AppLayout subtitle="Kako koristiti eMenza portal" title="Pomoć">
        <HelpContent />
      </AppLayout>
    );
  }

  return (
    <PublicPomocShell>
      <HelpContent />
    </PublicPomocShell>
  );
}

export default PomocPage;