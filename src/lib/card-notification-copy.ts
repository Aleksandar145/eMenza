import { formatCardValidUntilLabel } from "@/lib/referent-cards-mock";
import type { AppLanguage } from "@/i18n/types";
import { getServerMessage } from "@/server/i18n/messages";

export type CardTopUpSource = "cash" | "bank";

export type CardNotificationCopy = {
  title: string;
  message: string;
  category: "administration" | "payment";
};

function formatAmountRsd(amountRsd: number, language: AppLanguage) {
  const locale = language === "en" ? "en-GB" : "sr-Latn-RS";
  return amountRsd.toLocaleString(locale);
}

export function buildCardActivatedCopy(
  studentName: string,
  language: AppLanguage = "sr",
): CardNotificationCopy {
  return {
    title: getServerMessage(language, "cardActivatedTitle"),
    message: getServerMessage(language, "cardActivatedMessage", { name: studentName }),
    category: "administration",
  };
}

export function buildCardTopUpCopy(
  amountRsd: number,
  source: CardTopUpSource,
  language: AppLanguage = "sr",
): CardNotificationCopy {
  const amount = formatAmountRsd(amountRsd, language);
  const channel = getServerMessage(
    language,
    source === "bank" ? "cardTopUpBank" : "cardTopUpCash",
  );

  return {
    title: getServerMessage(language, "cardTopUpTitle"),
    message: getServerMessage(language, "cardTopUpMessage", { amount, channel }),
    category: "payment",
  };
}

export function buildCardBlockedCopy(reason?: string, language: AppLanguage = "sr"): CardNotificationCopy {
  const detail = reason?.trim()
    ? getServerMessage(language, "cardBlockedReason", { reason: reason.trim() })
    : getServerMessage(language, "cardBlockedDefault");

  return {
    title: getServerMessage(language, "cardBlockedTitle"),
    message: getServerMessage(language, "cardBlockedMessage", { detail }),
    category: "administration",
  };
}

export function buildCardExtendedCopy(validUntil: string, language: AppLanguage = "sr"): CardNotificationCopy {
  return {
    title: getServerMessage(language, "cardExtendedTitle"),
    message: getServerMessage(language, "cardExtendedMessage", {
      date: formatCardValidUntilLabel(validUntil),
    }),
    category: "administration",
  };
}
