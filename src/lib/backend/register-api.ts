import { apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import { loadReferentCardsState } from "@/lib/referent-cards-store";

export const REGISTER_EMAIL_EXISTS_MESSAGE = "Student sa ovim emailom već postoji.";
export const REGISTER_CARD_EXISTS_MESSAGE = "Kartica sa ovim brojem je već registrovana.";

export async function checkRegisterEmailAvailable(email: string) {
  const normalized = email.trim().toLowerCase();

  if (isClientBackendEnabled()) {
    await apiPost("/api/auth/register/validate", { email: normalized });
    return;
  }

  const taken = loadReferentCardsState().cards.some(
    (card) => card.email.toLowerCase() === normalized,
  );
  if (taken) {
    throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
  }
}

export async function checkRegisterCardAvailable(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");

  if (isClientBackendEnabled()) {
    await apiPost("/api/auth/register/validate", { cardNumber: digits });
    return;
  }

  const taken = loadReferentCardsState().cards.some((card) => card.cardNumber === digits);
  if (taken) {
    throw new Error(REGISTER_CARD_EXISTS_MESSAGE);
  }
}
