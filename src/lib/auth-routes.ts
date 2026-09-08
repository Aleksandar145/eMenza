const STAFF_PREFIXES = ["/admin", "/referent", "/kuhinja"] as const;

export function isStaffPath(pathname: string) {
  return STAFF_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
