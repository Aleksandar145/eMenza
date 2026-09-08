import { jsonError } from "@/server/auth/session";
import { getServerMessage } from "@/server/i18n/messages";
import { getStudentAppLanguage } from "@/server/i18n/user-language";
import type { AppLanguage } from "@/i18n/types";

export async function jsonStudentError(
  profileId: string | null | undefined,
  key: string,
  status = 400,
  values?: Record<string, string | number>,
) {
  const language: AppLanguage = profileId ? await getStudentAppLanguage(profileId) : "sr";
  return jsonError(getServerMessage(language, key, values), status);
}

export function jsonStudentErrorSync(
  language: AppLanguage,
  key: string,
  status = 400,
  values?: Record<string, string | number>,
) {
  return jsonError(getServerMessage(language, key, values), status);
}
