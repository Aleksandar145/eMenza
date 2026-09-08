"use client";

import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { CameraOff, QrCode, ScanLine } from "lucide-react";
import { QrScannerLaserOverlay } from "@/components/kuhinja/QrScannerLaserOverlay";
import { StaffCard } from "@/components/staff";

type KitchenCounterQrScannerProps = {
  disabled?: boolean;
  disabledMessage?: string;
  description?: string;
  footerLabel?: string;
  onDetect: (raw: string) => void;
  title?: string;
};

const scanDebounceMs = 2000;

export function KitchenCounterQrScanner({
  disabled = false,
  disabledMessage = "Servis trenutno nije aktivan.",
  description = "Usmerite kameru ka pickup QR kodu — automatsko prepoznavanje.",
  footerLabel = "Pickup QR",
  onDetect,
  title = "QR skeniranje",
}: KitchenCounterQrScannerProps) {
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [cameraError, setCameraError] = useState(false);

  function handleScan(detectedCodes: { rawValue: string }[]) {
    const rawValue = detectedCodes[0]?.rawValue?.trim();
    if (!rawValue || disabled) {
      return;
    }

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.value === rawValue && now - last.at < scanDebounceMs) {
      return;
    }

    lastScanRef.current = { value: rawValue, at: now };
    onDetect(rawValue);
  }

  const showCamera = !disabled && !cameraError;

  return (
    <StaffCard
      className="flex h-full flex-col"
      actions={
        showCamera ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="qr-camera-pulse size-1.5 rounded-full bg-emerald-500" />
            Kamera aktivna
          </span>
        ) : null
      }
      description={description}
      title={title}
    >
      <div className="relative overflow-hidden rounded-[20px] bg-[#0f1117] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(15,17,23,0.18)]">
        <div className="relative aspect-[4/3] min-h-[240px] w-full">
          {disabled ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
                <CameraOff aria-hidden="true" className="text-white/35" size={28} />
              </div>
              <p className="max-w-[220px] text-sm text-white/55">{disabledMessage}</p>
            </div>
          ) : cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
                <CameraOff aria-hidden="true" className="text-white/35" size={28} />
              </div>
              <p className="max-w-[240px] text-sm text-white/55">
                Kamera nije dostupna. Dozvolite pristup u browseru ili koristite ručni unos.
              </p>
            </div>
          ) : (
            <>
              <Scanner
                allowMultiple
                onError={() => setCameraError(true)}
                onScan={handleScan}
                scanDelay={scanDebounceMs}
                sound={false}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    inset: 0,
                  },
                  video: {
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                  },
                }}
              />
              <QrScannerLaserOverlay />
            </>
          )}
        </div>

        {showCamera ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/8 bg-black/35 px-4 py-3 backdrop-blur-sm">
            <span className="inline-flex items-center gap-2 text-xs text-white/65">
              <ScanLine aria-hidden="true" className="text-[#5055D2]" size={14} />
              Skeniranje u toku
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
              <QrCode aria-hidden="true" size={14} />
              {footerLabel}
            </span>
          </div>
        ) : null}
      </div>
    </StaffCard>
  );
}

export default KitchenCounterQrScanner;
