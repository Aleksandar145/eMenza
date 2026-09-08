"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CreditCard, Keyboard, Search } from "lucide-react";
import { KitchenCounterQrScanner } from "@/components/kuhinja/KitchenCounterQrScanner";
import { KitchenCounterQueueStatus } from "@/components/kuhinja/KitchenCounterQueueStatus";
import { useKitchenCounterQueue } from "@/hooks/useKitchenCounterQueue";
import { buildCardQrPayload } from "@/lib/card-qr";
import {
  isCompleteLookupInput,
  performKitchenCounterLookup,
} from "@/lib/kitchen-counter-lookup";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";
import { StaffCard, staffInputClass, staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";

type KitchenCounterLookupPanelProps = {
  dateKey: string;
  mealType: MealType | null;
  isServing: boolean;
  focusToken?: number;
  onReservationFound: (reservation: KitchenReservationRecord | null) => void;
  isPickupCodeServed?: (code: string) => boolean;
};

const demoPickupCode = "EMZ-20260303-L-847291";
const demoCardId = "EMZ-CARD-7842";
const autoLookupDelayMs = 350;

export function KitchenCounterLookupPanel({
  dateKey,
  mealType,
  isServing,
  focusToken = 0,
  onReservationFound,
  isPickupCodeServed,
}: KitchenCounterLookupPanelProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [autoDisplay, setAutoDisplay] = useState(true);
  const lookupInFlightRef = useRef(false);
  const autoLookupKeyRef = useRef("");
  const lastResolvedKeyRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queue = useKitchenCounterQueue();

  const lookupDisabled = !isServing || mealType === null;

  useEffect(() => {
    if (focusToken > 0 && !lookupDisabled) {
      inputRef.current?.focus();
      autoLookupKeyRef.current = "";
      lastResolvedKeyRef.current = "";
    }
  }, [focusToken, lookupDisabled]);

  useEffect(() => {
    autoLookupKeyRef.current = "";
  }, [input]);

  async function runLookup(raw: string, clearInputOnSuccess: boolean) {
    if (lookupDisabled || lookupInFlightRef.current) {
      if (lookupDisabled) {
        setError("Servis trenutno nije aktivan.");
        onReservationFound(null);
      }
      return;
    }

    const lookupKey = `${dateKey}:${mealType}:${raw.trim().toUpperCase()}`;
    if (lookupKey === lastResolvedKeyRef.current) {
      return;
    }

    const normalized = raw.trim().toUpperCase();
    const maybePickupCode = normalized.startsWith("EMZ-") && !normalized.startsWith("EMZ-CARD-");
    if (maybePickupCode && isPickupCodeServed?.(normalized)) {
      setError("Ova porudžbina je već preuzeta.");
      onReservationFound(null);
      lastResolvedKeyRef.current = lookupKey;
      return;
    }

    lookupInFlightRef.current = true;
    try {
      if (!lookupDisabled) {
        queue.recordLookupAttempt();
      }

      const result = await performKitchenCounterLookup(raw, dateKey, mealType);
      if (!result.ok) {
        setError(result.error);
        onReservationFound(null);
        return;
      }

      lastResolvedKeyRef.current = lookupKey;
      setError(null);
      onReservationFound(result.reservation);
      if (clearInputOnSuccess) {
        setInput("");
        autoLookupKeyRef.current = "";
      }
    } finally {
      lookupInFlightRef.current = false;
    }
  }

  async function handleManualLookup() {
    await runLookup(input, true);
  }

  function handleManualKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleManualLookup();
    }
  }

  useEffect(() => {
    if (!autoDisplay || lookupDisabled) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed || !isCompleteLookupInput(trimmed)) {
      return;
    }

    const lookupKey = `${dateKey}:${mealType}:${trimmed}`;
    if (lookupKey === autoLookupKeyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      autoLookupKeyRef.current = lookupKey;
      void runLookup(trimmed, true);
    }, autoLookupDelayMs);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDisplay, input, lookupDisabled, dateKey, mealType]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <StaffCard className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <Keyboard aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-black">Ručni unos</h2>
            <p className="mt-0.5 text-sm font-light text-black/55">
              Unesite ID kartice, pickup QR kod ili nalepite sadržaj sa čitača.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className={staffButtonSecondaryClass}
                disabled={lookupDisabled}
                onClick={() => {
                  setInput(demoPickupCode);
                  setError(null);
                  autoLookupKeyRef.current = "";
                }}
                type="button"
              >
                {demoPickupCode}
              </button>
              <button
                className={`${staffButtonSecondaryClass} inline-flex items-center gap-1.5`}
                disabled={lookupDisabled}
                onClick={() => {
                  setInput(buildCardQrPayload(demoCardId));
                  setError(null);
                  autoLookupKeyRef.current = "";
                }}
                type="button"
              >
                <CreditCard aria-hidden="true" size={14} />
                Jovana (kartica)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3">
          <input
            ref={inputRef}
            autoComplete="off"
            className={`${staffInputClass} font-mono`}
            disabled={lookupDisabled}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
            }}
            onKeyDown={handleManualKeyDown}
            placeholder="EMZ-20260303-L-847291"
            spellCheck={false}
            type="text"
            value={input}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={`${staffButtonPrimaryClass} inline-flex items-center justify-center gap-2`}
              disabled={lookupDisabled}
              onClick={() => void handleManualLookup()}
              type="button"
            >
              <Search aria-hidden="true" size={16} />
              Prikaži rezervaciju
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/5 bg-black/[0.02] px-3 py-2 text-xs font-semibold text-black/65">
              <input
                checked={autoDisplay}
                className="size-3.5 rounded border-black/15 text-[#5055D2] focus:ring-[#5055D2]/20"
                disabled={lookupDisabled}
                onChange={(event) => setAutoDisplay(event.target.checked)}
                type="checkbox"
              />
              Automatski prikaz
            </label>
          </div>
          {lookupDisabled ? (
            <p className="text-sm text-black/45">Servis trenutno nije aktivan.</p>
          ) : autoDisplay ? (
            <p className="text-xs text-black/45">
              Detalji se prikazuju čim je kod potpun — Enter i dalje radi ručno.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-auto border-t border-black/5 pt-4">
          <KitchenCounterQueueStatus
            countLastMinute={queue.countLastMinute}
            disabled={lookupDisabled}
            level={queue.level}
            manualExpiresAt={queue.manualExpiresAt}
            onClearManual={queue.clearManualOverride}
            onSelectLevel={queue.setManualLevel}
            source={queue.source}
          />
        </div>
      </StaffCard>

      <KitchenCounterQrScanner
        disabled={lookupDisabled}
        disabledMessage="Servis trenutno nije aktivan."
        onDetect={(raw) => void runLookup(raw, false)}
      />
    </div>
  );
}

export default KitchenCounterLookupPanel;
