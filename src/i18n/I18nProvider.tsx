"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useUserSettingsContext } from "@/contexts/UserSettingsProvider";
import { getMessages } from "@/i18n/messages";
import { resolveMessage } from "@/i18n/translate";
import type { AppLanguage, TranslationValues } from "@/i18n/types";

type I18nContextValue = {
  language: AppLanguage;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, isLoaded } = useUserSettingsContext();
  const language: AppLanguage = isLoaded && settings.app.language === "en" ? "en" : "sr";

  const messages = useMemo(() => getMessages(language), [language]);

  const t = useCallback(
    (key: string, values?: TranslationValues) => resolveMessage(messages, key, values),
    [messages],
  );

  const value = useMemo(() => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useT must be used within I18nProvider");
  }
  return context;
}
