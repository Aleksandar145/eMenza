"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, ScanLine } from "lucide-react";
import QRCode from "react-qr-code";
import { formatPickupCode, type PickupOrder } from "@/lib/preuzimanje-mock";

type QrPickupDisplayProps = {
  order: PickupOrder;
  size?: number;
  layout?: "centered" | "compact";
};

async function downloadSvgAsPng(svgElement: SVGSVGElement, filename: string) {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  const exportSize = Math.max(
    Number(clonedSvg.getAttribute("width")) || svgElement.clientWidth,
    Number(clonedSvg.getAttribute("height")) || svgElement.clientHeight,
    256,
  );

  clonedSvg.setAttribute("width", String(exportSize));
  clonedSvg.setAttribute("height", String(exportSize));

  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("QR slika nije učitana."));
      img.src = svgUrl;
    });

    const padding = 32;
    const canvas = document.createElement("canvas");
    canvas.width = exportSize + padding * 2;
    canvas.height = exportSize + padding * 2;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas nije dostupan.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, padding, padding, exportSize, exportSize);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("PNG nije kreiran."));
      }, "image/png");
    });

    const downloadUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function QrPickupDisplay({ order, size = 220, layout = "centered" }: QrPickupDisplayProps) {
  const isCompact = layout === "compact";
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const code = formatPickupCode(order.pickupCode);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleDownload() {
    const svgElement = qrContainerRef.current?.querySelector("svg");
    if (!svgElement) {
      return;
    }

    try {
      await downloadSvgAsPng(
        svgElement,
        `emenza-qr-${code.replace(/[^a-zA-Z0-9-]/g, "")}.png`,
      );
      setDownloaded(true);
      window.setTimeout(() => setDownloaded(false), 2000);
    } catch {
      setDownloaded(false);
    }
  }

  return (
    <div
      className={`flex flex-col ${
        isCompact ? "items-center lg:items-end lg:max-w-[220px]" : "items-center"
      }`}
    >
      <div
        className={`rounded-2xl border border-black/5 bg-white shadow-[0_4px_24px_rgba(80,85,210,0.08)] ${
          isCompact ? "p-3" : "p-4"
        }`}
        ref={qrContainerRef}
      >
        <QRCode
          bgColor="#FFFFFF"
          fgColor="#5055D2"
          level="M"
          size={size}
          value={code}
        />
      </div>

      <p
        className={`mt-3 font-mono font-bold tracking-wide text-black ${
          isCompact ? "text-sm lg:text-right" : "mt-5 text-base sm:text-lg"
        }`}
      >
        {code}
      </p>

      <div
        className={`mt-2 flex flex-wrap gap-2 ${
          isCompact
            ? "w-full flex-col items-stretch lg:items-end"
            : "items-center justify-center"
        }`}
      >
        <button
          className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-[#5055D2]/30 bg-white font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/10 ${
            isCompact ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"
          }`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <Check aria-hidden="true" size={16} />
              Kopirano
            </>
          ) : (
            <>
              <Copy aria-hidden="true" size={16} />
              Kopiraj kod
            </>
          )}
        </button>
        <button
          className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 ${
            isCompact ? "px-4 py-2 text-xs" : "px-5 py-2.5 text-sm"
          }`}
          onClick={handleDownload}
          style={{
            backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
          }}
          type="button"
        >
          {downloaded ? (
            <>
              <Check aria-hidden="true" size={16} />
              Preuzeto
            </>
          ) : (
            <>
              <Download aria-hidden="true" size={16} />
              Preuzmi QR sliku
            </>
          )}
        </button>
      </div>

      <p
        className={`mt-2 text-xs font-light text-black/45 ${
          isCompact ? "max-w-xs text-center lg:text-right" : "mt-3 max-w-md text-center"
        }`}
      >
        Sačuvajte sliku na telefon — možete je pokazati na šalteru i bez interneta.
      </p>

      <div
        className={`mt-3 flex items-start gap-2.5 rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-3 py-2.5 ${
          isCompact ? "w-full max-w-xs" : "mt-4 w-full max-w-md"
        }`}
      >
        <ScanLine aria-hidden="true" className="mt-0.5 shrink-0 text-[#5055D2]" size={18} />
        <p className="text-xs font-light leading-relaxed text-black/60 lg:text-right">
          Pokažite ovaj QR kod osoblju na šalteru. Skeniranjem se otvara vaša narudžbina za{" "}
          <span className="font-semibold text-black">{order.mealLabel.toLowerCase()}</span> (
          {order.dateLabel}).
        </p>
      </div>
    </div>
  );
}

export default QrPickupDisplay;
