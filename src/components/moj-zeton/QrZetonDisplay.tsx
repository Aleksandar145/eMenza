"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, Ticket } from "lucide-react";
import QRCode from "react-qr-code";
import { buildZetonQrPayload } from "@/lib/zeton-qr";

type QrZetonDisplayProps = {
  tokenCode: string;
  size?: number;
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
    if (!context) throw new Error("Canvas nije dostupan.");
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, padding, padding, exportSize, exportSize);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) { resolve(blob); return; }
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

export function QrZetonDisplay({ tokenCode, size = 200 }: QrZetonDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const payload = buildZetonQrPayload(tokenCode);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tokenCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }

  async function handleDownload() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
    await downloadSvgAsPng(svg as SVGSVGElement, `ezeton-${tokenCode.toLowerCase()}.png`);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <Ticket aria-hidden="true" className="text-[#5055D2]" size={18} />
        <span className="text-sm font-semibold text-black/60">eZeton QR</span>
      </div>

      <div
        ref={qrRef}
        className="flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
      >
        <QRCode bgColor="#FFFFFF" fgColor="#5055D2" level="M" size={size} value={payload} />
      </div>

      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5055D2]/30 bg-white px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:border-[#5055D2] hover:bg-[#5055D2]/5"
          onClick={() => void handleCopy()}
          type="button"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Kopiran" : "Kopiraj kod"}
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5055D2]/30 bg-white px-4 py-2 text-sm font-semibold text-[#5055D2] transition-colors hover:border-[#5055D2] hover:bg-[#5055D2]/5"
          onClick={() => void handleDownload()}
          type="button"
        >
          <Download size={14} />
          {downloaded ? "Preuzeto" : "Preuzmi QR"}
        </button>
      </div>

      <p className="text-xs font-light text-black/50 text-center max-w-xs">
        Pokažite ovaj QR kod osoblju na šalteru prilikom vraćanja pribora.
      </p>
    </div>
  );
}

export default QrZetonDisplay;
