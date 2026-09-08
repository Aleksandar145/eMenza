import type { AppLanguage } from "@/i18n/types";

export function resolveAppLocale(language: AppLanguage): string {
  return language === "en" ? "en-GB" : "sr-Latn-RS";
}

export function resolveCompareLocale(language: AppLanguage): string {
  return language === "en" ? "en" : "sr";
}
