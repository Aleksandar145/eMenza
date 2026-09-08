import { createHash } from "node:crypto";
import { buildStudentAvatarUrl } from "@/lib/student-avatar";

export function buildGravatarUrl(email: string, size = 128) {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export function resolveStudentAvatarUrl(input: {
  email: string;
  oauthImageUrl?: string | null;
  firstName: string;
  lastName: string;
  displayName?: string;
}) {
  const oauthImageUrl = input.oauthImageUrl?.trim();
  if (oauthImageUrl) {
    return oauthImageUrl;
  }

  const email = input.email.trim();
  if (email) {
    return buildGravatarUrl(email);
  }

  return buildStudentAvatarUrl(input.firstName, input.lastName, input.displayName);
}
