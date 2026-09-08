import { Clock, Mail, Phone } from "lucide-react";
import type { HelpContact } from "@/lib/pomoc-mock";

type HelpContactCardProps = {
  contact: HelpContact;
};

export function HelpContactCard({ contact }: HelpContactCardProps) {
  return (
    <div className="rounded-3xl border border-black/5 bg-[#5055D2] p-5 text-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] lg:p-6">
      <h3 className="text-lg font-bold lg:text-xl">{contact.title}</h3>
      <p className="mt-2 text-sm font-light leading-relaxed text-white/80 lg:text-base">
        {contact.note}
      </p>

      <ul className="mt-5 space-y-3">
        <li>
          <a
            className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80 lg:text-base"
            href={`mailto:${contact.email}`}
          >
            <Mail aria-hidden="true" className="size-5 shrink-0" />
            {contact.email}
          </a>
        </li>
        <li>
          <a
            className="flex items-center gap-3 text-sm transition-opacity hover:opacity-80 lg:text-base"
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
          >
            <Phone aria-hidden="true" className="size-5 shrink-0" />
            {contact.phone}
          </a>
        </li>
        <li className="flex items-center gap-3 text-sm text-white/90 lg:text-base">
          <Clock aria-hidden="true" className="size-5 shrink-0" />
          {contact.hours}
        </li>
      </ul>
    </div>
  );
}
