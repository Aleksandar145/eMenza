import {
  kitchenNavGroups,
  type StaffNavGroup,
} from "@/components/staff/staff-nav";

export type KitchenStaffRole = "moderator" | "kuvar" | "salter";

export type KitchenNavGroupId = StaffNavGroup["id"];

export const kitchenRoleLabels: Record<KitchenStaffRole, string> = {
  moderator: "Moderator",
  kuvar: "Kuvar",
  salter: "Operater šaltera",
};

export const kitchenGroupAccess: Record<KitchenNavGroupId, KitchenStaffRole[]> = {
  general: ["moderator", "kuvar", "salter"],
  counter: ["moderator", "salter"],
  kitchen: ["moderator", "kuvar"],
};

const kitchenRoutePrefixes: Record<KitchenNavGroupId, string[]> = {
  general: ["/kuhinja/obavestenja", "/kuhinja/pregled-jelovnika", "/kuhinja/utisci"],
  counter: ["/kuhinja/narudzbine", "/kuhinja/vracanje-zetona"],
  kitchen: ["/kuhinja/jelovnik", "/kuhinja/priprema"],
};

const kitchenWeeklyScheduleRoute = "/kuhinja/nedeljni-raspored";
const kitchenStaffManagementRoute = "/kuhinja/zaposleni";

export function canManageKitchenStaff(role: KitchenStaffRole): boolean {
  return role === "moderator";
}

export function canEditKitchenWeeklySchedule(role: KitchenStaffRole): boolean {
  return role === "moderator";
}

export function canEditKitchenMenu(role: KitchenStaffRole): boolean {
  return role === "moderator";
}

function isKitchenStaffManagementRoute(pathname: string): boolean {
  return (
    pathname === kitchenStaffManagementRoute ||
    pathname.startsWith(`${kitchenStaffManagementRoute}/`)
  );
}

function isKitchenWeeklyScheduleRoute(pathname: string): boolean {
  return pathname === kitchenWeeklyScheduleRoute || pathname.startsWith(`${kitchenWeeklyScheduleRoute}/`);
}

export function canAccessKitchenGroup(role: KitchenStaffRole, groupId: KitchenNavGroupId): boolean {
  return kitchenGroupAccess[groupId].includes(role);
}

export function filterKitchenNavGroups(role: KitchenStaffRole): StaffNavGroup[] {
  return kitchenNavGroups
    .filter((group) => canAccessKitchenGroup(role, group.id))
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.allowedRoles || item.allowedRoles.includes(role),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function getVisibleKitchenNavItems(role: KitchenStaffRole) {
  return filterKitchenNavGroups(role).flatMap((group) => group.items);
}

export function getKitchenRouteGroup(pathname: string): KitchenNavGroupId | null {
  if (pathname === "/kuhinja" || pathname === "/kuhinja/") {
    return "general";
  }

  if (pathname === "/kuhinja/login") {
    return null;
  }

  for (const [groupId, prefixes] of Object.entries(kitchenRoutePrefixes) as [
    KitchenNavGroupId,
    string[],
  ][]) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return groupId;
    }
  }

  if (pathname.startsWith("/kuhinja")) {
    return "general";
  }

  return null;
}

export function canAccessKitchenRoute(role: KitchenStaffRole, pathname: string): boolean {
  if (isKitchenStaffManagementRoute(pathname)) {
    return canManageKitchenStaff(role);
  }

  if (isKitchenWeeklyScheduleRoute(pathname)) {
    return canAccessKitchenGroup(role, "general");
  }

  const group = getKitchenRouteGroup(pathname);
  if (group === null) {
    return true;
  }

  return canAccessKitchenGroup(role, group);
}

export function getKitchenHomeRoute(): string {
  return "/kuhinja";
}

export function normalizeKitchenStaffRole(role: unknown): KitchenStaffRole {
  if (role === "moderator" || role === "kuvar" || role === "salter") {
    return role;
  }

  return "moderator";
}
