import type { AppLanguage } from "@/i18n/types";
import { resolveUserLanguageFromSettings } from "@/server/i18n/messages";
import { getUserSettingsDb } from "@/server/repositories/settings";

export async function getStudentAppLanguage(profileId: string): Promise<AppLanguage> {
  try {
    const settings = await getUserSettingsDb(profileId);
    return resolveUserLanguageFromSettings(settings);
  } catch {
    return "sr";
  }
}
