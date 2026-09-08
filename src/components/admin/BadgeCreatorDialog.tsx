"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { addCustomBadgeDef } from "@/lib/custom-badges-store";
import { staffButtonPrimaryClass, staffButtonSecondaryClass, staffInputClass } from "@/components/staff";

const BG_PRESETS = [
  "#FEF3C7", "#DBEAFE", "#D1FAE5", "#FCE7F3",
  "#EDE9FE", "#FEE2E2", "#E0F2FE", "#ECFCCB",
  "#FFF1F2", "#F5F5F4", "#F3E8FF", "#F0FDF4",
  "#FEF9C3", "#FFEDD5", "#E0E7FF", "#FCE7F3",
];

const TEXT_PRESETS = [
  "#92400E", "#1E40AF", "#065F46", "#9D174D",
  "#5B21B6", "#991B1B", "#075985", "#3F6212",
  "#9F1239", "#292524", "#6B21A8", "#166534",
  "#854D0E", "#9A3412", "#3730A3", "#BE185D",
];

type BadgeCreatorDialogProps = {
  onClose: () => void;
};

export function BadgeCreatorDialog({ onClose }: BadgeCreatorDialogProps) {
  const [name, setName] = useState("");
  const [bgColor, setBgColor] = useState(BG_PRESETS[0]);
  const [textColor, setTextColor] = useState(TEXT_PRESETS[0]);

  function handleSave() {
    if (!name.trim()) return;
    addCustomBadgeDef({ name: name.trim(), bgColor, textColor });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Kreiraj bedž</h3>
          <button
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Ime bedža
            </label>
            <input
              className={`${staffInputClass} w-full`}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Bez laktoze"
              value={name}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Boja pozadine
            </label>
            <div className="flex items-center gap-2">
              <input
                className="size-9 cursor-pointer rounded-md border border-[var(--border-primary)] p-0.5"
                onChange={(e) => setBgColor(e.target.value)}
                type="color"
                value={bgColor}
              />
              <input
                className={`${staffInputClass} w-28 font-mono text-xs uppercase`}
                onChange={(e) => setBgColor(e.target.value)}
                value={bgColor}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {BG_PRESETS.map((c) => (
                <button
                  key={c}
                  className={`size-7 rounded-full border-2 transition-shadow ${
                    bgColor === c ? "border-[#5055D2] shadow-md" : "border-transparent"
                  }`}
                  onClick={() => setBgColor(c)}
                  style={{ backgroundColor: c }}
                  title={c}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Boja teksta
            </label>
            <div className="flex items-center gap-2">
              <input
                className="size-9 cursor-pointer rounded-md border border-[var(--border-primary)] p-0.5"
                onChange={(e) => setTextColor(e.target.value)}
                type="color"
                value={textColor}
              />
              <input
                className={`${staffInputClass} w-28 font-mono text-xs uppercase`}
                onChange={(e) => setTextColor(e.target.value)}
                value={textColor}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {TEXT_PRESETS.map((c) => (
                <button
                  key={c}
                  className={`size-7 rounded-full border-2 transition-shadow ${
                    textColor === c ? "border-[#5055D2] shadow-md" : "border-transparent"
                  }`}
                  onClick={() => setTextColor(c)}
                  style={{ backgroundColor: c }}
                  title={c}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {name || "Bedž"}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className={staffButtonSecondaryClass} onClick={onClose} type="button">
            Otkaži
          </button>
          <button
            className={staffButtonPrimaryClass}
            disabled={!name.trim()}
            onClick={handleSave}
            type="button"
          >
            Kreiraj
          </button>
        </div>
      </div>
    </div>
  );
}
