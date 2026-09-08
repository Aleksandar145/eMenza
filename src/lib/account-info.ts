import { formatCalendarDateLabel, toDateKey } from "@/lib/calendar-utils";
import type { AccountInfo } from "@/lib/podesavanja-mock";
import type { RegisterRole } from "@/lib/register-mock";
import { resolveStudentProfileKind } from "@/lib/student-profile";

export const ACCOUNT_REGISTERED_AT_PLACEHOLDER = "—";

export function getAccountTypeLabel(studentKind?: RegisterRole | null): string {
  const kind = resolveStudentProfileKind({
    studentKind: studentKind ?? undefined,
  });
  return kind === "ucenik" ? "Učenik" : "Student";
}

export function formatAccountRegisteredAt(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(parsed.getTime())) {
    return ACCOUNT_REGISTERED_AT_PLACEHOLDER;
  }

  const dateKey = toDateKey({
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  });

  return `${formatCalendarDateLabel(dateKey)}.`;
}

export function buildAccountInfo(input: {
  studentKind?: RegisterRole | null;
  createdAt?: Date | string | null;
  registrationOnboardingCompleted?: boolean;
}): AccountInfo {
  const account: AccountInfo = {
    accountType: getAccountTypeLabel(input.studentKind),
    registeredAt: input.createdAt
      ? formatAccountRegisteredAt(input.createdAt)
      : ACCOUNT_REGISTERED_AT_PLACEHOLDER,
  };

  if (input.registrationOnboardingCompleted !== undefined) {
    account.registrationOnboardingCompleted = input.registrationOnboardingCompleted;
  }

  return account;
}

export function isRegistrationOnboardingPending(
  account: AccountInfo | null | undefined,
): boolean {
  return account?.registrationOnboardingCompleted === false;
}
