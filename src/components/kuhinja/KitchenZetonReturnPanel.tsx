"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Ticket, UtensilsCrossed } from "lucide-react";
import { StaffCard, staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";
import { formatZetonTimestamp, zetonStatusLabels } from "@/lib/ezeton-mock";
import type { EzetonRecord } from "@/lib/ezeton-store";
import { returnZetonCutlery } from "@/lib/ezeton-store";
import { shouldUseEzetonApi, returnTokenViaApi } from "@/lib/backend/ezeton-api";

type KitchenZetonReturnPanelProps = {
  record: EzetonRecord | null;
  lookupError: string | null;
  onNext: () => void;
};

const toneBadgeStyles = {
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
  muted: "bg-black/8 text-black/55 ring-black/10",
};

export function KitchenZetonReturnPanel({
  record,
  lookupError,
  onNext,
}: KitchenZetonReturnPanelProps) {
  const [displayRecord, setDisplayRecord] = useState(record);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayRecord(record);
    setSuccessMessage(null);
    setConfirmError(null);
  }, [record?.tokenCode, record]);

  async function handleConfirm() {
    if (!displayRecord) {
      return;
    }

    setIsSubmitting(true);
    setConfirmError(null);

    if (shouldUseEzetonApi()) {
      try {
        const token = await returnTokenViaApi(displayRecord.tokenCode);
        setIsSubmitting(false);
        setDisplayRecord({
          ...displayRecord,
          zeton: {
            ...displayRecord.zeton,
            status: token.status as "active" | "used",
            usedAt: null,
          },
        });
        setSuccessMessage(`Pribor vraćen — žeton ${token.tokenCode} je ponovo aktivan.`);
        return;
      } catch (error) {
        setIsSubmitting(false);
        setConfirmError(error instanceof Error ? error.message : "Vraćanje žetona nije uspelo.");
        return;
      }
    }

    const result = returnZetonCutlery(displayRecord.tokenCode);
    setIsSubmitting(false);

    if (!result.ok) {
      setConfirmError(result.error);
      return;
    }

    setDisplayRecord(result.record);
    setSuccessMessage(`Pribor vraćen — žeton ${result.record.tokenCode} je ponovo aktivan.`);
  }

  if (!displayRecord && !record && lookupError) {
    return (
      <StaffCard className="border-red-100 p-5">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {lookupError}
        </p>
      </StaffCard>
    );
  }

  if (!displayRecord && !record && !lookupError && !successMessage) {
    return (
      <StaffCard className="flex min-h-[200px] flex-col items-center justify-center border-dashed border-black/10 bg-black/[0.015] p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#5055D2]/10">
          <Ticket aria-hidden="true" className="text-[#5055D2]" size={28} />
        </div>
        <p className="mt-4 text-base font-bold text-black">Nema skeniranog žetona</p>
        <p className="mt-2 max-w-md text-sm font-light text-black/55">
          Skenirajte QR kod u sekciji ispod ili unesite kod ručno — ovde će se prikazati student i
          dugme za potvrdu.
        </p>
      </StaffCard>
    );
  }

  if (!displayRecord) {
    return null;
  }

  const meta = zetonStatusLabels[displayRecord.zeton.status];
  const badgeClass = toneBadgeStyles[meta.tone];

  return (
    <StaffCard className="overflow-hidden p-0">
      {successMessage ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <p className="text-sm font-semibold text-emerald-900">{successMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5 p-5 lg:border-r lg:border-black/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Student</p>
              <p className="mt-1 text-xl font-bold text-black">{displayRecord.studentName}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass}`}
            >
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-[#EFF1F4]/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Kod žetona</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-black">
                {displayRecord.tokenCode}
              </p>
            </div>

            {displayRecord.zeton.usedAt && !successMessage ? (
              <div className="rounded-2xl border border-black/5 bg-[#EFF1F4]/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Pribor preuzet
                </p>
                <p className="mt-1 text-sm font-semibold text-black">
                  {formatZetonTimestamp(displayRecord.zeton.usedAt)}
                </p>
              </div>
            ) : null}
          </div>

          {displayRecord.zeton.mealName ? (
            <div className="rounded-2xl border border-black/5 bg-white px-4 py-3">
              <div className="flex items-start gap-3">
                <UtensilsCrossed
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#5055D2]"
                  size={18}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Obrok</p>
                  <p className="mt-0.5 text-sm font-bold text-black">{displayRecord.zeton.mealName}</p>
                  {displayRecord.zeton.mealSlot ? (
                    <p className="mt-0.5 text-xs font-light text-black/55">
                      {displayRecord.zeton.mealSlot}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {confirmError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {confirmError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col justify-center gap-3 border-t border-black/5 bg-black/[0.015] p-5 lg:min-w-[220px] lg:border-t-0">
          {!successMessage ? (
            <button
              className={`${staffButtonPrimaryClass} w-full justify-center`}
              disabled={isSubmitting || displayRecord.zeton.status !== "used"}
              onClick={() => void handleConfirm()}
              type="button"
            >
              Potvrdi vraćanje pribora
            </button>
          ) : null}
          <button className={`${staffButtonSecondaryClass} w-full justify-center`} onClick={onNext} type="button">
            Sledeći žeton
          </button>
        </div>
      </div>
    </StaffCard>
  );
}

export default KitchenZetonReturnPanel;
