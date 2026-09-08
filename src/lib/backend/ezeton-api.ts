import type { EzetonTokenRecord } from "@/server/repositories/ezeton";
import { apiGetData, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseEzetonApi() {
  return isClientBackendEnabled();
}

export async function fetchMyTokenFromApi() {
  const data = await apiGetData<{ token: EzetonTokenRecord | null }>("/api/ezeton");
  return data.token;
}

export async function purchaseTokenViaApi(depositRsd?: number) {
  const data = await apiPost<{ token: EzetonTokenRecord }>("/api/ezeton/purchase-deposit", {
    depositRsd,
  });
  return data.token;
}

export async function lookupTokenByCodeFromApi(code: string) {
  const data = await apiGetData<{ token: EzetonTokenRecord; studentName: string }>(
    `/api/ezeton/lookup?code=${encodeURIComponent(code)}`,
  );
  return data;
}

export async function consumeTokenViaApi(profileId: string, mealName?: string | null) {
  const data = await apiPost<{ token: EzetonTokenRecord }>("/api/ezeton/consume", {
    profileId,
    mealName: mealName ?? null,
  });
  return data.token;
}

export async function returnTokenViaApi(tokenCode: string) {
  const data = await apiPost<{ token: EzetonTokenRecord }>("/api/ezeton/return", {
    tokenCode,
  });
  return data.token;
}

export async function reactivateTokenViaApi(depositRsd?: number) {
  const data = await apiPost<{ token: EzetonTokenRecord }>("/api/ezeton/reactivate", {
    depositRsd,
  });
  return data.token;
}
