import type { ProfileSettings } from "@/lib/podesavanja-mock";

export const LOCKED_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "cardNumber",
  "faculty",
  "generation",
] as const satisfies ReadonlyArray<keyof ProfileSettings>;

export const PROFILE_READONLY_HINT =
  "Ova polja možete promeniti samo preko referenta studentskog centra.";
