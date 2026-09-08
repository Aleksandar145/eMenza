"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, History, Search, X, type LucideIcon } from "lucide-react";
import { KitchenSlotDishesDisplay } from "@/components/kuhinja/KitchenSlotDishesDisplay";
import { getReservationSlotRows } from "@/lib/kuhinja-order-display";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";

type KitchenOrderHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  history: KitchenReservationRecord[];
  variant?: "history" | "pending";
  title?: string;
  description?: string;
  emptyMessage?: string;
  icon?: LucideIcon;
  modalTitleId?: string;
};

export function KitchenOrderHistoryModal({
  isOpen,
  onClose,
  history,
  variant = "history",
  title = "Istorija preuzimanja",
  description = "Prethodno preuzete narudžbine za izabrani obrok.",
  emptyMessage = "Još nema preuzetih narudžbina danas.",
  icon: Icon = History,
  modalTitleId = "kitchen-history-modal-title",
}: KitchenOrderHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.trim().toLowerCase();
    return history.filter(
      (r) =>
        r.studentFullName?.toLowerCase().includes(q) ||
        r.studentName?.toLowerCase().includes(q) ||
        r.cardId?.toLowerCase().includes(q),
    );
  }, [history, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery("");
    setExpandedId(null);
  }, [isOpen]);

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
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape, isOpen]);

  if (!isOpen) return null;

  const isPending = variant === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Zatvori modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        type="button"
      />

      <section
        aria-labelledby={modalTitleId}
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#5055D2]/10">
              <Icon aria-hidden="true" className="text-[#5055D2]" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black" id={modalTitleId}>
                {title}
              </h2>
              <p className="mt-0.5 text-sm font-light text-black/55">{description}</p>
            </div>
          </div>
          <button
            aria-label="Zatvori"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/5 hover:text-black"
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="relative border-b border-black/5 px-5 py-3">
          <Search className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-black/35" size={16} />
          <input
            className="w-full rounded-xl border border-black/10 bg-black/[0.02] py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-[#5055D2]/40 focus:bg-white focus:ring-2 focus:ring-[#5055D2]/10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži po imenu ili broju kartice..."
            type="text"
            value={searchQuery}
          />
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-black/55">
              {searchQuery.trim() ? "Nema rezultata pretrage." : emptyMessage}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((reservation) => (
                <li key={reservation.id}>
                  {isPending ? (
                    <div className="rounded-xl border border-black/5 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-black">
                        {reservation.studentFullName ?? reservation.studentName}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-black/5 bg-white">
                      <div className="flex items-center justify-between px-4 py-3">
                        <p className="text-sm font-semibold text-black">
                          {reservation.studentFullName ?? reservation.studentName}
                        </p>
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#5055D2] transition-colors hover:bg-[#5055D2]/10"
                          onClick={() =>
                            setExpandedId(expandedId === reservation.id ? null : reservation.id)
                          }
                          type="button"
                        >
                          Vidi porudžbinu
                          <ChevronDown
                            className="transition-transform"
                            size={14}
                            style={{
                              transform:
                                expandedId === reservation.id ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                      </div>
                      {expandedId === reservation.id && (
                        <CompactOrderDetails reservation={reservation} />
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function CompactOrderDetails({
  reservation,
}: {
  reservation: KitchenReservationRecord;
}) {
  const slots = useMemo(() => getReservationSlotRows(reservation), [reservation]);
  const mainSlot = slots.find((s) => s.slotId === "main");
  const otherSlots = slots.filter((s) => s.slotId !== "main");

  return (
    <div className="border-t border-black/5 px-4 py-3">
      {mainSlot && (
        <div className="mb-2">
          <KitchenSlotDishesDisplay
            dishes={mainSlot.dishes}
            prominent
            showLabel
            slotId={mainSlot.slotId}
          />
        </div>
      )}
      {otherSlots.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {otherSlots.map((slot) => (
            <KitchenSlotDishesDisplay
              key={slot.slotId}
              dishes={slot.dishes}
              showLabel
              slotId={slot.slotId}
            />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-black/45">
        <span>{reservation.mealType === "breakfast" ? "Doručak" : reservation.mealType === "lunch" ? "Ručak" : "Večera"}</span>
        {reservation.items.isPosno && <span>· Posno</span>}
        {reservation.pickupMode === "poneti" && <span>· Za poneti</span>}
      </div>
    </div>
  );
}

export default KitchenOrderHistoryModal;
