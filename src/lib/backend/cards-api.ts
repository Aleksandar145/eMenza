import type { ReferentCardsState, StudentCard } from "@/lib/referent-cards-mock";
import { apiGetData, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

let inFlightMyCard: Promise<StudentCard | null> | null = null;

export async function fetchCardsStateFromApi(): Promise<ReferentCardsState> {
  return apiGetData<ReferentCardsState>("/api/cards");
}

export async function fetchMyCardFromApi(): Promise<StudentCard | null> {
  if (inFlightMyCard) {
    return inFlightMyCard;
  }

  inFlightMyCard = apiGetData<{ card: StudentCard | null }>("/api/cards/me")
    .then((data) => data.card)
    .finally(() => {
      inFlightMyCard = null;
    });

  return inFlightMyCard;
}

export async function postCardAction(
  cardId: string,
  body: Record<string, unknown>,
): Promise<ReferentCardsState> {
  return apiPost<ReferentCardsState>(`/api/cards/${cardId}`, body);
}

export function shouldUseCardsApi() {
  return isClientBackendEnabled();
}
