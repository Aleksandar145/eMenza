"use client";

const cornerClass =
  "absolute size-10 rounded-sm border-[#5055D2] drop-shadow-[0_0_6px_rgba(80,85,210,0.75)]";

export function QrScannerLaserOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="relative aspect-square w-full max-w-[260px]">
          <div
            className="absolute inset-0 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.62)]"
          />

          <span className={`${cornerClass} left-0 top-0 border-l-[3px] border-t-[3px]`} />
          <span className={`${cornerClass} right-0 top-0 border-r-[3px] border-t-[3px]`} />
          <span className={`${cornerClass} bottom-0 left-0 border-b-[3px] border-l-[3px]`} />
          <span className={`${cornerClass} bottom-0 right-0 border-b-[3px] border-r-[3px]`} />

          <span className="qr-scan-line qr-scan-line-a absolute inset-x-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#5055D2] to-transparent shadow-[0_0_10px_#5055D2,0_0_20px_rgba(80,85,210,0.45)]" />
          <span className="qr-scan-line qr-scan-line-b absolute inset-x-6 h-[1px] rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.65)]" />

          <div className="absolute inset-x-0 bottom-3 text-center">
            <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur-sm">
              Poravnajte QR kod u okvir
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QrScannerLaserOverlay;
