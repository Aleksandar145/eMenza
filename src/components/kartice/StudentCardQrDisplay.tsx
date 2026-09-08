"use client";

import { useState } from "react";
import { Check, Copy, ScanLine } from "lucide-react";
import QRCode from "react-qr-code";
import { buildCardQrPayload } from "@/lib/card-qr";

type StudentCardQrDisplayProps = {
  cardId: string;
};

export function StudentCardQrDisplay({ cardId }: StudentCardQrDisplayProps) {
  const payload = buildCardQrPayload(cardId);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-black/5 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <h2 className="text-base font-bold text-black">QR identitet kartice</h2>
      <p className="mt-1 text-sm font-light text-black/55">
        Pokažite referentu za brzu identifikaciju na šalteru.
      </p>

      <div className="mt-5 flex flex-col items-center">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_4px_24px_rgba(80,85,210,0.08)]">
          <QRCode bgColor="#FFFFFF" fgColor="#5055D2" level="M" size={180} value={payload} />
        </div>

        <p className="mt-4 font-mono text-sm font-bold tracking-wide text-black">{cardId}</p>

        <button
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#5055D2]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <Check aria-hidden="true" size={16} />
              Kopirano
            </>
          ) : (
            <>
              <Copy aria-hidden="true" size={16} />
              Kopiraj QR sadržaj
            </>
          )}
        </button>

        <div className="mt-4 flex w-full max-w-md items-start gap-3 rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-3">
          <ScanLine aria-hidden="true" className="mt-0.5 shrink-0 text-[#5055D2]" size={20} />
          <p className="text-sm font-light leading-relaxed text-black/60">
            Referent može skenirati ili nalepiti sadržaj QR koda da odmah otvori vašu karticu.
          </p>
        </div>
      </div>
    </section>
  );
}

export default StudentCardQrDisplay;
