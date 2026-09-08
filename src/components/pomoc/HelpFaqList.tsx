"use client";

import { ChevronDown } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type { HelpFaqItem } from "@/lib/pomoc-mock";

type HelpFaqListProps = {
  items: HelpFaqItem[];
};

export function HelpFaqList({ items }: HelpFaqListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index));
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(index);
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            key={item.question}
          >
            <button
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#EFF1F4]/60 lg:px-5 lg:py-4"
              onClick={() => toggle(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              type="button"
            >
              <span className="text-sm font-semibold text-black lg:text-base">
                {item.question}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-5 shrink-0 text-[#5055D2] transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen ? (
              <div className="border-t border-black/5 px-4 pb-4 pt-2 lg:px-5 lg:pb-5">
                <p className="text-sm font-light leading-relaxed text-black/65 lg:text-base">
                  {item.answer}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
