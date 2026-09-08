"use client";

import { Ticket, UtensilsCrossed } from "lucide-react";
import { zetonCardClassName, zetonCardPaddingClassName } from "@/components/moj-zeton/zeton-ui";
import {
  formatZetonTimestamp,
  type UserZetonState,
  zetonStatusLabels,
} from "@/lib/ezeton-mock";
import { QrZetonDisplay } from "@/components/moj-zeton/QrZetonDisplay";

type ZetonStatusCardProps = {
  zeton: UserZetonState;
  depositRsd?: number;
};

const toneStyles = {
  success: {
    dot: "bg-[#55de9a] shadow-[0_0_6px_rgba(85,222,154,0.8)]",
    badge: "bg-[#55de9a]/20 text-white",
  },
  warning: {
    dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]",
    badge: "bg-amber-400/20 text-white",
  },
  muted: {
    dot: "bg-white/50",
    badge: "bg-white/15 text-white/90",
  },
};

export function ZetonStatusCard({ zeton, depositRsd = 0 }: ZetonStatusCardProps) {
  const meta = zetonStatusLabels[zeton.status];
  const tone = toneStyles[meta.tone];

  return (
    <section className={`${zetonCardClassName} h-full`}>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] px-5 py-5 lg:px-6 lg:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10"
        />
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Ticket aria-hidden="true" className="text-white" size={22} />
              </div>
              <div>
                <p className="text-lg font-bold text-white lg:text-xl">eZeton</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`size-2 rounded-full ${tone.dot}`} />
                  <span className="text-xs font-medium text-white/90">{meta.label}</span>
                </div>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${tone.badge}`}
            >
              {zeton.status === "none" ? "Neaktivan" : zeton.status === "used" ? "Iskorišćen" : "Aktivan"}
            </span>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Kod žetona</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-white lg:text-3xl">
              {zeton.tokenCode}
            </p>
          </div>
        </div>
      </div>

      <div className={`space-y-4 ${zetonCardPaddingClassName}`}>
        <p className="text-sm font-light leading-relaxed text-black/60">{meta.description}</p>

        {zeton.mealName ? (
          <div className="rounded-2xl border border-black/5 bg-[#EFF1F4]/70 px-4 py-3">
            <div className="flex items-start gap-3">
              <UtensilsCrossed aria-hidden="true" className="mt-0.5 shrink-0 text-[#5055D2]" size={18} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Veza sa obrokom</p>
                <p className="mt-0.5 text-sm font-bold text-black">{zeton.mealName}</p>
                {zeton.mealSlot ? (
                  <p className="mt-0.5 text-xs font-light text-black/55">{zeton.mealSlot}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {zeton.status === "active" || zeton.status === "used" ? (
          <div className="rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-4">
            <p className="text-sm font-light leading-relaxed text-black/60 mb-3">
              {zeton.status === "active"
                ? "Pokažite QR kod na šalteru prilikom vraćanja pribora."
                : "QR kod za vraćanje pribora — pokažite osoblju na šalteru."}
            </p>
            <QrZetonDisplay tokenCode={zeton.tokenCode} size={180} />
          </div>
        ) : null}

        {zeton.status === "used" ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-sm font-light leading-relaxed text-black/65">
              Vratite pribor u restoranu — administrator će ponovo aktivirati vaš žeton.
              {zeton.usedAt ? (
                <>
                  {" "}
                  Pribor preuzet:{" "}
                  <span className="font-medium text-black/75">
                    {formatZetonTimestamp(zeton.usedAt)}
                  </span>
                  .
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/5 pt-4 text-xs text-black/50">
          {depositRsd > 0 ? (
            <span>
              Kaucija:{" "}
              <span className="font-semibold text-black/70">
                {depositRsd.toLocaleString("sr-RS")} RSD
              </span>
            </span>
          ) : null}
          {zeton.claimedAt ? (
            <span>
              Aktiviran:{" "}
              <span className="font-medium text-black/70">{formatZetonTimestamp(zeton.claimedAt)}</span>
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default ZetonStatusCard;
