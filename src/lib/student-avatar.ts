import {
  buildStudentProfileSubtitle,
  type StudentProfileKind,
} from "@/lib/student-profile";

const AVATAR_COLORS = ["5055D2", "6368e0", "9093E1", "3d42b8", "6b70d9"] as const;

function hashName(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getStudentInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || "EM";
}

export function buildStudentAvatarUrl(firstName: string, lastName: string, displayName?: string) {
  const label = `${firstName} ${lastName}`.trim() || displayName?.trim() || "Student";
  const initials = getStudentInitials(firstName, lastName);
  const color = AVATAR_COLORS[hashName(label) % AVATAR_COLORS.length];
  const encoded = encodeURIComponent(initials);
  return `https://ui-avatars.com/api/?name=${encoded}&background=${color}&color=fff&size=128&bold=true`;
}

export function buildStudentSubtitle(input: {
  kind: StudentProfileKind;
  schoolOrFaculty: string;
  indexNumber?: string;
}) {
  return buildStudentProfileSubtitle(input);
}
