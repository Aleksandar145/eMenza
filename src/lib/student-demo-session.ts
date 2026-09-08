import { studentProfile } from "@/lib/dashboard-mock";

export const STUDENT_DEMO_COOKIE = "emenza_student_demo";

export type StudentDemoSession = {
  email: string;
  displayName: string;
  loggedInAt: string;
};

export const DEMO_STUDENT_SESSION: StudentDemoSession = {
  email: "marija.simic@student.rs",
  displayName: studentProfile.name,
  loggedInAt: new Date().toISOString(),
};

function isStudentDemoSession(value: unknown): value is StudentDemoSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<StudentDemoSession>;
  return Boolean(session.email && session.displayName && session.loggedInAt);
}

export function parseStudentDemoCookie(raw: string | undefined | null): StudentDemoSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    return isStudentDemoSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeStudentDemoCookie(session: StudentDemoSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function setStudentDemoCookie(session: StudentDemoSession = DEMO_STUDENT_SESSION) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${STUDENT_DEMO_COOKIE}=${serializeStudentDemoCookie(session)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearStudentDemoCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${STUDENT_DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readStudentDemoCookieFromDocument(): StudentDemoSession | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${STUDENT_DEMO_COOKIE}=`;
  const match = document.cookie.split("; ").find((chunk) => chunk.startsWith(prefix));
  if (!match) {
    return null;
  }

  return parseStudentDemoCookie(match.slice(prefix.length));
}
