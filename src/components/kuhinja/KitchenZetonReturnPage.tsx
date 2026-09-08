"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, Clock } from "lucide-react";
import { KitchenZetonReturnLookupPanel } from "@/components/kuhinja/KitchenZetonReturnLookupPanel";
import { KitchenZetonReturnPanel } from "@/components/kuhinja/KitchenZetonReturnPanel";
import { StaffStatCard, staffButtonSecondaryClass } from "@/components/staff";
import { useEzeton } from "@/hooks/useEzeton";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import type { EzetonRecord } from "@/lib/ezeton-store";

export function KitchenZetonReturnPage() {
  const { records } = useEzeton();
  const todayDateKey = useTodayDateKey();
  const [record, setRecord] = useState<EzetonRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const awaitingReturn = useMemo(
    () => records.filter((item) => item.zeton.status === "used").length,
    [records],
  );

  const returnedToday = useMemo(
    () =>
      records.reduce((total, item) => {
        const todayReturns = item.history.filter(
          (event) =>
            event.type === "cutlery_returned" &&
            event.timestamp.startsWith(todayDateKey),
        ).length;
        return total + todayReturns;
      }, 0),
    [records, todayDateKey],
  );

  const handleNext = useCallback(() => {
    setRecord(null);
    setLookupError(null);
    setFocusToken((value) => value + 1);
  }, []);

  function handleLookupResult(result: { record: EzetonRecord | null; error: string | null }) {
    setRecord(result.record);
    setLookupError(result.error);
  }

  const hasActiveLookup = record !== null || lookupError !== null;

  useEffect(() => {
    if (!hasActiveLookup) {
      return;
    }

    function handleEnterKey(event: KeyboardEvent) {
      if (event.key !== "Enter") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      event.preventDefault();
      handleNext();
    }

    window.addEventListener("keydown", handleEnterKey);
    return () => window.removeEventListener("keydown", handleEnterKey);
  }, [handleNext, hasActiveLookup]);

  return (
    <div className="space-y-8">
      <section aria-labelledby="zeton-stats-heading">
        <h2 className="sr-only" id="zeton-stats-heading">
          Pregled dana
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <StaffStatCard
            accent="warning"
            icon={Clock}
            label="Čeka vraćanje"
            meta={awaitingReturn > 0 ? "Pribor u studentovom posedu" : "Nema žetona na čekanju"}
            value={String(awaitingReturn)}
          />
          <StaffStatCard
            accent="success"
            icon={CheckCheck}
            label="Vraćeno danas"
            meta="Potvrđena vraćanja pribora"
            value={String(returnedToday)}
          />
        </div>
      </section>

      <section aria-labelledby="zeton-confirm-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-black" id="zeton-confirm-heading">
              Potvrda vraćanja
            </h2>
            <p className="mt-0.5 text-sm font-light text-black/55">
              Proverite studenta i status žetona pre potvrde.
            </p>
          </div>
          {hasActiveLookup ? (
            <button className={staffButtonSecondaryClass} onClick={handleNext} type="button">
              Sledeći žeton
              <span className="ml-1.5 hidden text-black/40 sm:inline">(Enter)</span>
            </button>
          ) : null}
        </div>
        <KitchenZetonReturnPanel
          lookupError={lookupError}
          onNext={handleNext}
          record={record}
        />
      </section>

      <section aria-labelledby="zeton-scan-heading" className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-black" id="zeton-scan-heading">
            Skeniraj žeton
          </h2>
          <p className="mt-0.5 text-sm font-light text-black/55">
            Usmerite kameru ka eZeton QR kodu ili unesite kod ručno ispod.
          </p>
        </div>
        <KitchenZetonReturnLookupPanel focusToken={focusToken} onLookupResult={handleLookupResult} />
      </section>
    </div>
  );
}

export default KitchenZetonReturnPage;
