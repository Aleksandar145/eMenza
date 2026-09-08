import type { RegisterRole } from "@/lib/register-mock";

export type StudentProfileKind = RegisterRole;

export function parseStudentDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function resolveStudentProfileKind(input: {
  studentKind?: StudentProfileKind;
  indexNumber?: string | null;
  generation?: string | null;
}): StudentProfileKind {
  if (input.studentKind === "ucenik" || input.studentKind === "student") {
    return input.studentKind;
  }

  const index = (input.indexNumber ?? input.generation ?? "").trim();
  return index ? "student" : "ucenik";
}

/** Podnaslov: učenik → „Učenik · škola“, student → „Student · fakultet · indeks“. */
export function buildStudentProfileSubtitle(input: {
  kind: StudentProfileKind;
  schoolOrFaculty: string;
  indexNumber?: string;
}) {
  const place = input.schoolOrFaculty.trim();

  if (input.kind === "ucenik") {
    return place ? `Učenik · ${place}` : "Učenik";
  }

  const index = input.indexNumber?.trim() ?? "";
  if (place && index) {
    return `Student · ${place} · ${index}`;
  }
  if (place) {
    return `Student · ${place}`;
  }
  return index ? `Student · ${index}` : "Student";
}
