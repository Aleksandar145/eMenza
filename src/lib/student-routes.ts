export const STUDENT_PROTECTED_PREFIXES = [
  "/rezervacije",
  "/kartice",
  "/podesavanja",
  "/preuzimanje",
  "/statistika",
  "/obavestenja",
  "/kreator-obroka",
  "/moj-zeton",
  "/knjiga-utisaka",
  "/ai-preporuka",
] as const;

export const STUDENT_AUTH_PREFIXES = ["/login", "/register", "/auth"] as const;

export function isStudentProtectedPath(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  return STUDENT_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isStudentAuthPath(pathname: string) {
  return STUDENT_AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function staffHomeForRole(role: string) {
  switch (role) {
    case "admin":
      return "/admin";
    case "referent":
      return "/referent";
    case "kitchen":
      return "/kuhinja";
    default:
      return "/";
  }
}
