export const KUHINJA_DEMO_COOKIE = "emenza_kuhinja_demo";

export type KitchenDemoRole = "moderator" | "kuvar" | "salter";

export type KitchenDemoSession = {
  email: string;
  displayName: string;
  role: KitchenDemoRole;
  loggedInAt: string;
};

const kitchenDemoRoles = new Set<KitchenDemoRole>(["moderator", "kuvar", "salter"]);

export function isKitchenDemoRole(value: string | undefined | null): value is KitchenDemoRole {
  return Boolean(value && kitchenDemoRoles.has(value as KitchenDemoRole));
}

function isKitchenDemoSession(value: unknown): value is KitchenDemoSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<KitchenDemoSession>;
  return Boolean(
    session.email &&
      session.displayName &&
      session.loggedInAt &&
      isKitchenDemoRole(session.role),
  );
}

export function parseKitchenDemoCookie(raw: string | undefined | null): KitchenDemoSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    return isKitchenDemoSession(parsed) ? parsed : null;
  } catch {
    // Legacy cookies stored only the role string (e.g. "kuvar") — treat as stale.
    return null;
  }
}

export function serializeKitchenDemoCookie(session: KitchenDemoSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function setKitchenDemoCookie(session: KitchenDemoSession) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${KUHINJA_DEMO_COOKIE}=${serializeKitchenDemoCookie(session)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearKitchenDemoCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${KUHINJA_DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readKitchenDemoCookieFromDocument(): KitchenDemoSession | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${KUHINJA_DEMO_COOKIE}=`;
  const match = document.cookie.split("; ").find((chunk) => chunk.startsWith(prefix));
  if (!match) {
    return null;
  }

  return parseKitchenDemoCookie(match.slice(prefix.length));
}
