import type { HelpSection } from "@/lib/pomoc-mock";

type HelpSectionCardProps = {
  section: HelpSection;
};

export function HelpSectionCard({ section }: HelpSectionCardProps) {
  const Icon = section.icon;

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <Icon aria-hidden="true" className="text-[#5055D2]" size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-black lg:text-xl">{section.title}</h3>
          <p className="mt-1 text-sm font-light leading-relaxed text-black/55 lg:text-base">
            {section.summary}
          </p>
        </div>
      </div>

      {section.steps && section.steps.length > 0 ? (
        <ol className="space-y-2.5 border-t border-black/5 pt-4">
          {section.steps.map((step, index) => (
            <li className="flex gap-3 text-sm leading-relaxed text-black/75 lg:text-base" key={step}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#5055D2] text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {section.tips && section.tips.length > 0 ? (
        <ul
          className={`space-y-2 ${section.steps?.length ? "mt-4 border-t border-black/5 pt-4" : "border-t border-black/5 pt-4"}`}
        >
          {section.tips.map((tip) => (
            <li
              className="flex gap-2 text-sm leading-relaxed text-black/65 before:shrink-0 before:font-bold before:text-[#5055D2] before:content-['•'] lg:text-base"
              key={tip}
            >
              {tip}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
