import type { AppLanguage } from "@/i18n/types";
import { enMessages } from "@/i18n/messages/en";
import { srMessages } from "@/i18n/messages/sr";

const catalogs = {
  sr: srMessages,
  en: enMessages,
} as const;

export type Messages = typeof srMessages | typeof enMessages;

export function getMessages(language: AppLanguage): Messages {
  return catalogs[language];
}

export { enMessages, srMessages };
