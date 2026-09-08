import type { AppLanguage } from "@/i18n/types";
import { enMessages } from "@/i18n/messages/en";
import { srMessages } from "@/i18n/messages/sr";
import { interpolate, resolveMessage } from "@/i18n/translate";

const serverCatalogs = {
  sr: srMessages.server,
  en: enMessages.server,
} as const;

export function getServerMessage(
  language: AppLanguage,
  key: string,
  values?: Record<string, string | number>,
): string {
  const catalog = serverCatalogs[language] as Record<string, unknown>;
  return resolveMessage(catalog, key, values);
}

export function resolveUserLanguageFromSettings(settings: unknown): AppLanguage {
  if (
    settings &&
    typeof settings === "object" &&
    "app" in settings &&
    settings.app &&
    typeof settings.app === "object" &&
    "language" in settings.app &&
    settings.app.language === "en"
  ) {
    return "en";
  }

  return "sr";
}

export { interpolate };
