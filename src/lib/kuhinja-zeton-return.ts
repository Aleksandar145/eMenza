import { lookupZetonByCode, type EzetonRecord } from "@/lib/ezeton-store";
import type { ZetonStatus } from "@/lib/ezeton-mock";
import { normalizeZetonLookupInput } from "@/lib/zeton-qr";
import { shouldUseEzetonApi, lookupTokenByCodeFromApi } from "@/lib/backend/ezeton-api";
import type { EzetonTokenRecord } from "@/server/repositories/ezeton";

export type ZetonReturnLookupResult =
  | { ok: true; record: EzetonRecord; lookupStatus: ZetonStatus; apiToken?: EzetonTokenRecord; apiStudentName?: string }
  | { ok: false; error: string };

export async function performZetonReturnLookup(raw: string): Promise<ZetonReturnLookupResult> {
  const tokenCode = normalizeZetonLookupInput(raw);
  if (!tokenCode) {
    return { ok: false, error: "Unesite eZeton QR kod ili kod žetona (npr. EZ-847291)." };
  }

  if (shouldUseEzetonApi()) {
    try {
      const data = await lookupTokenByCodeFromApi(tokenCode);
      const record: EzetonRecord = {
        tokenCode: data.token.tokenCode,
        studentName: data.studentName,
        zeton: {
          status: data.token.status,
          tokenCode: data.token.tokenCode,
          mealName: data.token.mealName,
          mealSlot: data.token.mealSlot,
          claimedAt: data.token.claimedAt,
          usedAt: data.token.consumedAt,
        },
        history: [],
      };

      if (data.token.status === "active") {
        return {
          ok: false,
          error: "Student još nije uzeo pribor — žeton nije spreman za vraćanje.",
        };
      }

      return { ok: true, record, lookupStatus: data.token.status, apiToken: data.token, apiStudentName: data.studentName };
    } catch {
      return { ok: false, error: "Žeton nije pronađen." };
    }
  }

  const record = lookupZetonByCode(tokenCode);
  if (!record) {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  if (record.zeton.status === "active") {
    return {
      ok: false,
      error: "Student još nije uzeo pribor — žeton nije spreman za vraćanje.",
    };
  }

  if (record.zeton.status === "none") {
    return { ok: false, error: "Žeton nije pronađen." };
  }

  return { ok: true, record, lookupStatus: record.zeton.status };
}
