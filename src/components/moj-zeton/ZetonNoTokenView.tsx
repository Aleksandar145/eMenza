import { AlertTriangle, Ticket } from "lucide-react";
import { zetonCardClassName, zetonCardPaddingClassName } from "@/components/moj-zeton/zeton-ui";

type ZetonNoTokenViewProps = {
  depositRsd: number;
  onBuyClick: () => void;
};

export function ZetonNoTokenView({ depositRsd, onBuyClick }: ZetonNoTokenViewProps) {
  return (
    <section className={`${zetonCardClassName} ${zetonCardPaddingClassName}`}>
      <div className="rounded-2xl border border-dashed border-black/12 bg-[#EFF1F4]/60 px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white">
          <Ticket aria-hidden="true" className="text-[#5055D2]/70" size={28} />
        </div>
        <h2 className="text-lg font-bold text-black">Još nemate eZeton</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-light leading-relaxed text-black/55">
          Ova stranica će postati vidljiva tek nakon što kupite žeton.
        </p>

        {depositRsd > 0 ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-black/70">
            Cena žetona iznosi:{" "}
            <strong className="font-bold text-[#5055D2]">
              {depositRsd.toLocaleString("sr-RS")} RSD
            </strong>
          </p>
        ) : null}

        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-left">
          <div className="flex gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-amber-700"
              size={18}
            />
            <p className="text-sm font-medium leading-relaxed text-amber-950/85">
              Pažnja: bez žetona nećete moći da preuzmete obrok na šalteru!
            </p>
          </div>
        </div>

        <button
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5055D2] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          onClick={onBuyClick}
          type="button"
        >
          <Ticket aria-hidden="true" size={16} />
          Kupite žeton
        </button>
      </div>
    </section>
  );
}

export default ZetonNoTokenView;
