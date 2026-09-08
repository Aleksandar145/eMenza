"use client";

import { FormEvent, useState } from "react";
import { useReferentSession } from "@/hooks/useReferentSession";
import { formatCardValidUntilLabel, validityPresets } from "@/lib/referent-cards-mock";
import { extendCardValidity } from "@/lib/referent-cards-store";

type ExtendValidityFormProps = {
  cardId: string;
  currentValidUntil: string;
  onSuccess?: () => void;
  compact?: boolean;
};

export function ExtendValidityForm({
  cardId,
  currentValidUntil,
  onSuccess,
  compact = false,
}: ExtendValidityFormProps) {
  const { session } = useReferentSession();
  const [customDate, setCustomDate] = useState(currentValidUntil);

  function handlePreset(dateKey: string) {
    if (!session) return;
    void extendCardValidity(cardId, dateKey, session.displayName).catch(() => {
      // Produženje nije uspelo — podaci ostaju nepromenjeni
    });
    setCustomDate(dateKey);
    onSuccess?.();
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !customDate) return;
    void extendCardValidity(cardId, customDate, session.displayName).catch(() => {
      // Produženje nije uspelo — podaci ostaju nepromenjeni
    });
    onSuccess?.();
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {validityPresets.map((preset) => (
          <button
            className="rounded-full border border-[#5055D2]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#5055D2] hover:bg-[#5055D2]/5"
            key={preset.id}
            onClick={() => handlePreset(preset.dateKey)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
        <form className="flex items-center gap-1" onSubmit={handleCustomSubmit}>
          <input
            className="rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs"
            onChange={(event) => setCustomDate(event.target.value)}
            type="date"
            value={customDate}
          />
          <button
            className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
            type="submit"
          >
            Sačuvaj
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/8 bg-[#EFF1F4]/50 p-4">
      <h3 className="text-sm font-bold text-black">Produženje važenja</h3>
      <p className="text-xs text-black/55">
        Trenutno važi do: {formatCardValidUntilLabel(currentValidUntil)}
      </p>
      <div className="flex flex-wrap gap-2">
        {validityPresets.map((preset) => (
          <button
            className="rounded-full border border-[#5055D2]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#5055D2] hover:bg-[#5055D2]/5"
            key={preset.id}
            onClick={() => handlePreset(preset.dateKey)}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleCustomSubmit}>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="valid-until">
            Prilagođeni datum
          </label>
          <input
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
            id="valid-until"
            onChange={(event) => setCustomDate(event.target.value)}
            type="date"
            value={customDate}
          />
        </div>
        <button
          className="rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white"
          type="submit"
        >
          Sačuvaj
        </button>
      </form>
    </div>
  );
}

export default ExtendValidityForm;
