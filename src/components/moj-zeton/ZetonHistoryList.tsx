import { Clock, History, ShieldCheck, ShoppingBag, Ticket, UtensilsCrossed } from "lucide-react";
import { zetonCardClassName, zetonCardPaddingClassName } from "@/components/moj-zeton/zeton-ui";
import { formatZetonTimestamp, type ZetonEvent } from "@/lib/ezeton-mock";

type ZetonHistoryListProps = {
  events: ZetonEvent[];
};

const eventIcons = {
  meal_claimed: ShoppingBag,
  cutlery_taken: UtensilsCrossed,
  cutlery_returned: ShieldCheck,
  token_purchased: Ticket,
};

const eventColors = {
  meal_claimed: "bg-[#5055D2]/10 text-[#5055D2]",
  cutlery_taken: "bg-amber-100 text-amber-700",
  cutlery_returned: "bg-[#55de9a]/15 text-[#1a7a4a]",
  token_purchased: "bg-[#5055D2]/10 text-[#5055D2]",
};

function ZetonHistoryHeader() {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-black/5 pb-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
        <History aria-hidden="true" className="text-[#5055D2]" size={20} />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-black">Istorija žetona</h2>
        <p className="text-sm font-light text-black/55">Pregled aktivnosti i događaja</p>
      </div>
    </div>
  );
}

function ZetonHistoryEmpty() {
  return (
    <section className={`${zetonCardClassName} ${zetonCardPaddingClassName}`}>
      <ZetonHistoryHeader />
      <div className="rounded-2xl border border-dashed border-black/12 bg-[#EFF1F4]/60 px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white">
          <Clock aria-hidden="true" className="text-black/30" size={28} />
        </div>
        <h3 className="text-base font-bold text-black">Još nema događaja</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm font-light text-black/55">
          Kada preuzmete obrok, kupite žeton ili vratite pribor, ovde će se pojaviti zapis.
        </p>
      </div>
    </section>
  );
}

export function ZetonHistoryList({ events }: ZetonHistoryListProps) {
  if (events.length === 0) {
    return <ZetonHistoryEmpty />;
  }

  return (
    <section className={`${zetonCardClassName} ${zetonCardPaddingClassName}`}>
      <ZetonHistoryHeader />
      <ul className="divide-y divide-black/5">
        {events.map((event) => {
          const Icon = eventIcons[event.type];

          return (
            <li className="flex gap-3 py-3 first:pt-0 last:pb-0" key={event.id}>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${eventColors[event.type]}`}
              >
                <Icon aria-hidden="true" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-black">{event.label}</p>
                  <time className="text-[11px] tabular-nums text-black/45">
                    {formatZetonTimestamp(event.timestamp)}
                  </time>
                </div>
                <p className="mt-0.5 text-xs font-light text-black/55">{event.detail}</p>
                {event.actor === "admin" ? (
                  <span className="mt-1 inline-flex rounded-full bg-[#EFF1F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/45">
                    Administrator
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ZetonHistoryList;
