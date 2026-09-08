import type { TranslationValues } from "@/i18n/types";

export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function resolveMessage(
  messages: Record<string, unknown>,
  key: string,
  values?: TranslationValues,
): string {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return key;
    }

    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== "string") {
    return key;
  }

  return interpolate(current, values);
}
