import { Ticket } from "lucide-react";
import { ezetonFlowSteps } from "@/lib/ezeton-mock";
import { zetonCardClassName, zetonCardPaddingClassName } from "@/components/moj-zeton/zeton-ui";

export function ZetonFlowSteps() {
  return (
    <section className={`${zetonCardClassName} flex h-full flex-col ${zetonCardPaddingClassName}`}>
      <div className="mb-5 flex items-center gap-3 border-b border-black/5 pb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <Ticket aria-hidden="true" className="text-[#5055D2]" size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-black">Kako funkcioniše</h2>
          <p className="text-sm font-light text-black/55">Od obroka do vraćanja pribora</p>
        </div>
      </div>

      <ol className="relative flex flex-1 flex-col">
        {ezetonFlowSteps.map((item, index) => {
          const isLast = index === ezetonFlowSteps.length - 1;

          return (
            <li className={`relative flex gap-3 ${isLast ? "" : "pb-4"}`} key={item.step}>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-7 bottom-0 w-px bg-[#5055D2]/20"
                />
              ) : null}
              <span className="relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full bg-[#5055D2] text-xs font-bold text-white">
                {item.step}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-bold text-black">{item.title}</p>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-black/55">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default ZetonFlowSteps;
