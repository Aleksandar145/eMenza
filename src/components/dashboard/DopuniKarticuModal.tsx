"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Banknote, Check, Copy, CreditCard, MapPin, X } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  cashTopUpOption,
  getPaymentReference,
  topUpPaymentDetails,
  topUpSteps,
} from "@/lib/dopuna-mock";

type DopuniKarticuModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      aria-label={`Kopiraj ${label}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 lg:text-sm"
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" size={14} />
          Kopirano
        </>
      ) : (
        <>
          <Copy aria-hidden="true" size={14} />
          Kopiraj
        </>
      )}
    </button>
  );
}

export function DopuniKarticuModal({ isOpen, onClose }: DopuniKarticuModalProps) {
  const { settings } = useUserSettings();
  const paymentReference = getPaymentReference({
    ...topUpPaymentDetails,
    studentIndex: settings.profile.generation || topUpPaymentDetails.studentIndex,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    },
    [handleClose],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Zatvori modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        type="button"
      />

      <section
        aria-labelledby="dopuni-modal-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
              <CreditCard aria-hidden="true" className="text-[#5055D2]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black lg:text-xl" id="dopuni-modal-title">
                Dopuna eMenza kartice
              </h2>
              <p className="mt-0.5 text-sm font-light text-black/55">
                Dopunite karticu gotovinom kod referenta ili bankarskom uplatom.
              </p>
            </div>
          </div>
          <button
            aria-label="Zatvori"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EFF1F4] text-black/55 transition-colors hover:text-black"
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="custom-scrollbar space-y-5 overflow-y-auto px-5 py-5 lg:px-6">
          <section className="rounded-2xl border border-[#2f8f55]/20 bg-[#2f8f55]/5 p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f8f55]/15">
                <Banknote aria-hidden="true" className="text-[#2f8f55]" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-black lg:text-base">{cashTopUpOption.title}</h3>
                <p className="mt-1 text-sm font-light leading-relaxed text-black/65">
                  {cashTopUpOption.intro}
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-3">
              {cashTopUpOption.steps.map((step) => (
                <li className="flex gap-3" key={step.order}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2f8f55] text-[11px] font-bold text-white">
                    {step.order}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-black">{step.title}</p>
                    <p className="mt-0.5 text-sm font-light leading-relaxed text-black/65">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold text-black/55">
                Minimalni iznos: {cashTopUpOption.minAmount}
              </p>
              <Link
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5055D2] hover:underline"
                href="/kartice"
                onClick={handleClose}
              >
                <MapPin aria-hidden="true" size={14} />
                QR kartice na Moje kartice
              </Link>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-black/8" />
            <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
              ili bankarska uplata
            </span>
            <div className="h-px flex-1 bg-black/8" />
          </div>

          <ol className="space-y-4">
            {topUpSteps.map((step) => (
              <li className="flex gap-3" key={step.order}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#5055D2] text-xs font-bold text-white">
                  {step.order}
                </span>
                <div>
                  <p className="text-sm font-semibold text-black lg:text-base">{step.title}</p>
                  <p className="mt-0.5 text-sm font-light leading-relaxed text-black/65">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl bg-[#EFF1F4] p-4 lg:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/45">
              Podaci za uplatu
            </p>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-light text-black/55">Primalac</dt>
                <dd className="text-sm font-semibold text-black lg:text-base">
                  {topUpPaymentDetails.recipient}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-light text-black/55">Broj računa (IBAN)</dt>
                <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-black">
                    {topUpPaymentDetails.accountNumber}
                  </span>
                  <CopyButton
                    label="IBAN"
                    value={topUpPaymentDetails.accountNumber.replace(/\s/g, "")}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-light text-black/55">Poziv na broj</dt>
                <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-black">
                    {paymentReference}
                  </span>
                  <CopyButton label="poziv na broj" value={paymentReference} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-light text-black/55">Minimalni iznos</dt>
                <dd className="text-sm font-semibold text-black">
                  {topUpPaymentDetails.minAmount}
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-sm font-light leading-relaxed text-black/55">
            {topUpPaymentDetails.processingNote}
          </p>
        </div>

        <div className="shrink-0 border-t border-black/5 px-5 py-4 lg:px-6">
          <button
            className="w-full rounded-2xl bg-[#5055D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4348B8] lg:text-base"
            onClick={handleClose}
            type="button"
          >
            Razumem
          </button>
        </div>
      </section>
    </div>
  );
}

export default DopuniKarticuModal;
