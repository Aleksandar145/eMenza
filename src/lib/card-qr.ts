const CARD_QR_PREFIX = "emenza-card:";

export function buildCardQrPayload(cardId: string): string {
  return `${CARD_QR_PREFIX}${cardId}`;
}

export function parseCardQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(CARD_QR_PREFIX)) {
    return null;
  }

  const cardId = trimmed.slice(CARD_QR_PREFIX.length).trim();
  return cardId || null;
}
