"use client";

import { useI18nContext } from "@/i18n/I18nProvider";
import { resolveAppLocale, resolveCompareLocale } from "@/i18n/locale";

export function useAppLocale() {
  const { language } = useI18nContext();

  return {
    language,
    locale: resolveAppLocale(language),
    compareLocale: resolveCompareLocale(language),
  };
}
