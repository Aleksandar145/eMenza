import type { UserReligion as RegisterReligion } from "@/lib/user-preferences";

export type RegisterAuthMethod = "email" | "google" | "apple";

export type RegisterRole = "ucenik" | "student";

export type { UserReligion as RegisterReligion } from "@/lib/user-preferences";
export { religionOptions, religionPreferenceDescription } from "@/lib/user-preferences";

export type RegisterStep = 1 | 2 | 3;

export type RegisterRoute = RegisterStep | "potvrda";

export type RegisterDraft = {
  step: RegisterStep;
  authMethod: RegisterAuthMethod;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: RegisterRole;
  religion: RegisterReligion | "";
  school?: string;
  faculty?: string;
  indexNumber?: string;
  cardNumber: string;
  termsAccepted: boolean;
  /** OAuth: korisnik je potvrdio email na koraku „potvrda“. */
  oauthEmailConfirmed?: boolean;
};

export type OAuthProfile = Pick<RegisterDraft, "firstName" | "lastName" | "email">;

export const REGISTER_DRAFT_STORAGE_KEY = "emenza-register-draft";
export const EMAIL_ONBOARDING_PENDING_KEY = "emenza-email-onboarding-pending";

export const facultyOptions = [
  "Fakultet organizacionih nauka",
  "Elektrotehnički fakultet",
  "Mašinski fakultet",
  "Fakultet primenjenih umetnosti",
  "Fakultet za specijalnu edukaciju i rehabilitaciju",
  "Pravni fakultet",
  "Ekonomski fakultet",
] as const;

/** Privremena lista dok admin ne doda punu listu u panelu. */
export const schoolOptions = [
  "Gimnazija „Jovan Jovanović Zmaj“, Novi Sad",
  "Gimnazija „Isidora Sekulića“, Novi Sad",
  "Srednja medicinska škola „7. april“, Novi Sad",
  "Srednja tehnička škola „Mihajlo Pupin“, Novi Sad",
  "Srednja ekonomska škola „Pinki“, Novi Sad",
] as const;

export const MOCK_GOOGLE_PROFILE: OAuthProfile = {
  firstName: "Marija",
  lastName: "Simić",
  email: "marija.simic@gmail.com",
};

export const MOCK_APPLE_PROFILE: OAuthProfile = {
  firstName: "Nikola",
  lastName: "Jovanović",
  email: "nikola.jovanovic@icloud.com",
};

export function createEmptyRegisterDraft(): RegisterDraft {
  return {
    step: 1,
    authMethod: "email",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "ucenik",
    religion: "",
    school: "",
    faculty: "",
    indexNumber: "",
    cardNumber: "",
    termsAccepted: false,
    oauthEmailConfirmed: false,
  };
}

export function loadRegisterDraft(): RegisterDraft {
  if (typeof window === "undefined") {
    return createEmptyRegisterDraft();
  }

  try {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_STORAGE_KEY);
    if (!raw) {
      return createEmptyRegisterDraft();
    }

    const parsed = JSON.parse(raw) as Partial<RegisterDraft>;
    return {
      ...createEmptyRegisterDraft(),
      ...parsed,
    };
  } catch {
    return createEmptyRegisterDraft();
  }
}

export function saveRegisterDraft(draft: RegisterDraft) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(REGISTER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearRegisterDraft() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
}

export function getRegisterBasicStepErrors(
  draft: RegisterDraft,
): Partial<Record<"firstName" | "lastName" | "email" | "password" | "termsAccepted", string>> {
  const errors: Partial<
    Record<"firstName" | "lastName" | "email" | "password" | "termsAccepted", string>
  > = {};

  if (draft.authMethod !== "email" && !draft.oauthEmailConfirmed) {
    errors.email = "Potvrdite email adresu nakon Google ili Apple prijave.";
    return errors;
  }

  if (!draft.firstName.trim()) {
    errors.firstName = "Unesite ime.";
  }

  if (!draft.lastName.trim()) {
    errors.lastName = "Unesite prezime.";
  }

  if (!draft.email.trim()) {
    errors.email = "Unesite email adresu.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    errors.email = "Email adresa nije ispravna.";
  }

  if (draft.authMethod === "email") {
    if (!draft.password) {
      errors.password = "Unesite lozinku.";
    } else if (draft.password.length < 8) {
      errors.password = "Lozinka mora imati najmanje 8 karaktera.";
    }
  }

  if (!draft.termsAccepted) {
    errors.termsAccepted = "Morate prihvatiti uslove korišćenja.";
  }

  return errors;
}

export function isRegisterBasicStepComplete(draft: RegisterDraft): boolean {
  return Object.keys(getRegisterBasicStepErrors(draft)).length === 0;
}

export function resolveRegisterStep(
  urlStep: RegisterStep | null,
  draft: RegisterDraft,
  options?: { allowStep3WithoutDraft?: boolean },
): RegisterStep {
  const requested = urlStep ?? 1;

  if (requested === 3 && options?.allowStep3WithoutDraft) {
    return 3;
  }

  if (requested >= 2 && !isRegisterBasicStepComplete(draft)) {
    return 1;
  }

  return requested;
}

export function parseRegisterStepParam(value: string | null): RegisterStep | null {
  if (value === "1" || value === "2" || value === "3") {
    return Number(value) as RegisterStep;
  }

  return null;
}

export function parseRegisterRouteParam(value: string | null): RegisterRoute | null {
  if (value === "potvrda") {
    return "potvrda";
  }

  return parseRegisterStepParam(value);
}

export function getRegisterHref(step?: RegisterStep) {
  if (!step || step === 1) {
    return "/register";
  }

  return `/register?korak=${step}`;
}

export function getRegisterVerifyHref() {
  return "/register?korak=potvrda";
}

export function resolveRegisterSchoolOrFaculty(draft: RegisterDraft) {
  const school = draft.school?.trim() ?? "";
  const faculty = draft.faculty?.trim() ?? "";

  if (draft.role === "ucenik") {
    return school || faculty;
  }

  return faculty || school;
}

/** Koraci registracije gde korisnik još nema završen studentski profil. */
export function isRegisterOnboardingPath(pathname: string, korakParam: string | null) {
  if (pathname === "/register/preferencije" || pathname.startsWith("/register/preferencije/")) {
    return true;
  }

  if (!pathname.startsWith("/register")) {
    return false;
  }

  return korakParam === "potvrda" || korakParam === "2" || korakParam === "3";
}
