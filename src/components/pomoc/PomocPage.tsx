"use client";

import AppLayout from "@/components/layout/AppLayout";
import { HelpContactCard } from "@/components/pomoc/HelpContactCard";
import { HelpFaqList } from "@/components/pomoc/HelpFaqList";
import { HelpSectionCard } from "@/components/pomoc/HelpSectionCard";
import { HelpWorkingHoursTable } from "@/components/pomoc/HelpWorkingHoursTable";
import {
  helpContact,
  helpFaq,
  helpIntro,
  helpSections,
} from "@/lib/pomoc-mock";

export function PomocPage() {
  return (
    <AppLayout subtitle="Kako koristiti eMenza portal" title="Pomoć">
      <div className="mx-auto max-w-3xl space-y-8">
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
    </AppLayout>
  );
}

export default PomocPage;
