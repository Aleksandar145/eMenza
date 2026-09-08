export const REGISTER_EMAIL_ONBOARDING_PATH = "/register?korak=3";

export function buildEmailVerifyCallbackUrl(origin: string) {
  const next = encodeURIComponent(REGISTER_EMAIL_ONBOARDING_PATH);
  return `${origin}/auth/callback?next=${next}`;
}

export function resolveStudentPostVerifyPath(nextParam: string | null) {
  if (!nextParam || nextParam === "/") {
    return REGISTER_EMAIL_ONBOARDING_PATH;
  }

  return nextParam;
}
