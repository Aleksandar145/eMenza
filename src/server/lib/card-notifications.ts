import {
  buildCardActivatedCopy,
  buildCardBlockedCopy,
  buildCardExtendedCopy,
  buildCardTopUpCopy,
  type CardTopUpSource,
} from "@/lib/card-notification-copy";
import { appendStudentNotificationDb } from "@/server/repositories/notifications";
import { getStudentAppLanguage } from "@/server/i18n/user-language";

type CardNotificationTarget = {
  profileId?: string;
  email?: string;
};

async function resolveLanguage(target: CardNotificationTarget) {
  if (!target.profileId) {
    return "sr" as const;
  }

  return getStudentAppLanguage(target.profileId);
}

export async function notifyCardActivated(
  target: CardNotificationTarget & { studentName: string },
) {
  const language = await resolveLanguage(target);
  const copy = buildCardActivatedCopy(target.studentName, language);
  await appendStudentNotificationDb({
    profileId: target.profileId,
    email: target.email,
    title: copy.title,
    message: copy.message,
    category: copy.category,
  });
}

export async function notifyCardTopUp(
  target: CardNotificationTarget,
  amountRsd: number,
  source: CardTopUpSource,
) {
  const language = await resolveLanguage(target);
  const copy = buildCardTopUpCopy(amountRsd, source, language);
  await appendStudentNotificationDb({
    profileId: target.profileId,
    email: target.email,
    title: copy.title,
    message: copy.message,
    category: copy.category,
  });
}

export async function notifyCardBlocked(
  target: CardNotificationTarget,
  reason?: string,
) {
  const language = await resolveLanguage(target);
  const copy = buildCardBlockedCopy(reason, language);
  await appendStudentNotificationDb({
    profileId: target.profileId,
    email: target.email,
    title: copy.title,
    message: copy.message,
    category: copy.category,
  });
}

export async function notifyCardExtended(target: CardNotificationTarget, validUntil: string) {
  const language = await resolveLanguage(target);
  const copy = buildCardExtendedCopy(validUntil, language);
  await appendStudentNotificationDb({
    profileId: target.profileId,
    email: target.email,
    title: copy.title,
    message: copy.message,
    category: copy.category,
  });
}
