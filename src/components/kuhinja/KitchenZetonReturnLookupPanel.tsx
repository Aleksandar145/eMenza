"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Keyboard, Search, Ticket } from "lucide-react";
import { KitchenCounterQrScanner } from "@/components/kuhinja/KitchenCounterQrScanner";
import {
  StaffCard,
  staffButtonPrimaryClass,
  staffButtonSecondaryClass,
  staffInputClass,
} from "@/components/staff";
import { performZetonReturnLookup } from "@/lib/kuhinja-zeton-return";
import type { EzetonRecord } from "@/lib/ezeton-store";
import { buildZetonQrPayload, isCompleteZetonLookupInput } from "@/lib/zeton-qr";

type KitchenZetonReturnLookupPanelProps = {
  focusToken?: number;
  onLookupResult: (result: { record: EzetonRecord | null; error: string | null }) => void;
};

const demoUsedToken = "EZ-847291";
const demoActiveToken = "EZ-502184";
const autoLookupDelayMs = 350;

export function KitchenZetonReturnLookupPanel({
  focusToken = 0,
  onLookupResult,
}: KitchenZetonReturnLookupPanelProps) {
  const [input, setInput] = useState("");
  const [autoDisplay, setAutoDisplay] = useState(true);
  const lookupInFlightRef = useRef(false);
  const autoLookupKeyRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken > 0) {
      inputRef.current?.focus();
      autoLookupKeyRef.current = "";
    }
  }, [focusToken]);

  useEffect(() => {
    autoLookupKeyRef.current = "";
  }, [input]);

  async function runLookup(raw: string, clearInputOnSuccess: boolean) {
    if (lookupInFlightRef.current) {
      return;
    }

    lookupInFlightRef.current = true;
    try {
      const result = await performZetonReturnLookup(raw);
      if (!result.ok) {
        onLookupResult({ record: null, error: result.error });
        return;
      }

      onLookupResult({ record: result.record, error: null });
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
    if (!autoDisplay) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed || !isCompleteZetonLookupInput(trimmed)) {
      return;
    }

    const lookupKey = trimmed;
    if (lookupKey === autoLookupKeyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      autoLookupKeyRef.current = lookupKey;
      void runLookup(trimmed, true);
    }, autoLookupDelayMs);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDisplay, input]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <StaffCard className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3 border-b border-black/5 pb-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
            <Keyboard aria-hidden="true" className="text-[#5055D2]" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-black">Ručni unos</h3>
            <p className="mt-0.5 text-sm font-light text-black/55">
              Kod žetona ili pun QR sadržaj sa čitača.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3">
          <input
            ref={inputRef}
            autoComplete="off"
            className={`${staffInputClass} font-mono`}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={handleManualKeyDown}
            placeholder="emenza-zeton:EZ-847291"
            spellCheck={false}
            type="text"
            value={input}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-black/40">Demo</span>
            <button
              className={staffButtonSecondaryClass}
              onClick={() => {
                setInput(buildZetonQrPayload(demoUsedToken));
                autoLookupKeyRef.current = "";
              }}
              type="button"
            >
              {demoUsedToken}
            </button>
            <button
              className={`${staffButtonSecondaryClass} inline-flex items-center gap-1.5`}
              onClick={() => {
                setInput(demoActiveToken);
                autoLookupKeyRef.current = "";
              }}
              type="button"
            >
              <Ticket aria-hidden="true" size={14} />
              Aktivan
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <button
              className={`${staffButtonPrimaryClass} inline-flex items-center justify-center gap-2`}
              onClick={() => void handleManualLookup()}
              type="button"
            >
              <Search aria-hidden="true" size={16} />
              Prikaži žeton
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/5 bg-black/[0.02] px-3 py-2 text-xs font-semibold text-black/65">
              <input
                checked={autoDisplay}
                className="size-3.5 rounded border-black/15 text-[#5055D2] focus:ring-[#5055D2]/20"
                onChange={(event) => setAutoDisplay(event.target.checked)}
                type="checkbox"
              />
              Automatski prikaz
            </label>
          </div>

          {autoDisplay ? (
            <p className="text-xs text-black/45">
              Detalji se u sekciji iznad prikazuju čim je kod potpun.
            </p>
          ) : null}
        </div>
      </StaffCard>

      <KitchenCounterQrScanner
        description="Usmerite kameru ka eZeton QR kodu na studentovom telefonu — automatsko prepoznavanje."
        footerLabel="eZeton QR"
        onDetect={(raw) => void runLookup(raw, false)}
        title="QR skeniranje"
      />
    </div>
  );
}

export default KitchenZetonReturnLookupPanel;
