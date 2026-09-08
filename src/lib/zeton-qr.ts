const ZETON_QR_PREFIX = "emenza-zeton:";

export const zetonCodePattern = /^EZ-\d{6}$/i;

export function buildZetonQrPayload(tokenCode: string): string {
  return `${ZETON_QR_PREFIX}${tokenCode}`;
}

export function parseZetonQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(ZETON_QR_PREFIX)) {
    return null;
  }

  const tokenCode = trimmed.slice(ZETON_QR_PREFIX.length).trim();
  return tokenCode || null;
}

export function normalizeZetonLookupInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const fromQr = parseZetonQrPayload(trimmed);
  if (fromQr && zetonCodePattern.test(fromQr)) {
    return fromQr.toUpperCase();
  }

  if (zetonCodePattern.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

export function isCompleteZetonLookupInput(raw: string): boolean {
  return normalizeZetonLookupInput(raw) !== null;
}
