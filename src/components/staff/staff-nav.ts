import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookUser,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  ListOrdered,
  Megaphone,
  MessageSquareText,
  ScrollText,
  Search,
  Settings,
  Ticket,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  ShieldAlert,
  Warehouse,
} from "lucide-react";

export type StaffPanel = "admin" | "kitchen" | "referent";

export type StaffNavBadgeKey =
  | "pendingDishes"
  | "menuDraft"
  | "pendingActivations"
  | "pendingProfileRequests";

export type StaffNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: StaffNavBadgeKey;
  mobilePrimary?: boolean;
};

export const adminNavItems: StaffNavItem[] = [
  { label: "Pregled", href: "/admin", icon: LayoutDashboard, mobilePrimary: true },
  {
    label: "Katalog jela",
    href: "/admin/katalog-jela",
    icon: UtensilsCrossed,
    badgeKey: "pendingDishes",
    mobilePrimary: true,
  },
  { label: "Obaveštenja", href: "/admin/obavestenja", icon: Megaphone, mobilePrimary: true },
  { label: "Knjiga utisaka", href: "/admin/knjiga-utisaka", icon: MessageSquareText },
  { label: "Žalbe", href: "/admin/zalbe", icon: ShieldAlert },
  { label: "Zaposleni", href: "/admin/zaposleni", icon: Users },
  { label: "Fakulteti i škole", href: "/admin/fakulteti", icon: GraduationCap },
  { label: "Podešavanja", href: "/admin/podesavanja", icon: Settings },
  { label: "Monitoring", href: "/admin/monitoring", icon: BarChart3, mobilePrimary: true },
  { label: "Activity Logs", href: "/admin/logs", icon: ScrollText, mobilePrimary: true },
];

export type AdminNavGroup = {
  id: string;
  label: string;
  items: StaffNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "general",
    label: "Generalno",
    items: [
      { label: "Pregled", href: "/admin", icon: LayoutDashboard, mobilePrimary: true },
    ],
  },
  {
    id: "content",
    label: "Sadržaj",
    items: [
      {
        label: "Katalog jela",
        href: "/admin/katalog-jela",
        icon: UtensilsCrossed,
        badgeKey: "pendingDishes",
        mobilePrimary: true,
      },
      {
        label: "Raspored",
        href: "/admin/raspored",
        icon: CalendarDays,
        mobilePrimary: true,
      },
      { label: "Obaveštenja", href: "/admin/obavestenja", icon: Megaphone, mobilePrimary: true },
      { label: "Knjiga utisaka", href: "/admin/knjiga-utisaka", icon: MessageSquareText },
      { label: "Žalbe", href: "/admin/zalbe", icon: ShieldAlert },
    ],
  },
  {
    id: "administration",
    label: "Administracija",
    items: [
      { label: "Zaposleni", href: "/admin/zaposleni", icon: Users },
      { label: "Fakulteti i škole", href: "/admin/fakulteti", icon: GraduationCap },
      { label: "Studenti i učenici", href: "/admin/studenti-i-ucenici", icon: BookUser },
      { label: "Podešavanja", href: "/admin/podesavanja", icon: Settings },
      { label: "Finansije", href: "/admin/finansije", icon: Wallet, mobilePrimary: true },
      { label: "Monitoring", href: "/admin/monitoring", icon: BarChart3, mobilePrimary: true },
      { label: "Activity Logs", href: "/admin/logs", icon: ScrollText, mobilePrimary: true },
    ],
  },
];

import type { KitchenStaffRole } from "@/lib/kuhinja-roles";

export type KitchenNavItem = StaffNavItem & {
  showAlertBadge?: boolean;
  showNoticeBadge?: boolean;
  allowedRoles?: KitchenStaffRole[];
};

export type StaffNavGroup = {
  id: "general" | "counter" | "kitchen";
  label: string;
  allowedRoles: KitchenStaffRole[];
  items: KitchenNavItem[];
};

export const kitchenNavGroups: StaffNavGroup[] = [
  {
    id: "general",
    label: "Generalno",
    allowedRoles: ["moderator", "kuvar", "salter"],
    items: [
      { label: "Pregled", href: "/kuhinja", icon: LayoutDashboard, mobilePrimary: true },
      {
        label: "Obaveštenja",
        href: "/kuhinja/obavestenja",
        icon: Megaphone,
        showNoticeBadge: true,
      },
      {
        label: "Pregled jelovnika",
        href: "/kuhinja/pregled-jelovnika",
        icon: CalendarDays,
        badgeKey: "menuDraft",
        showAlertBadge: true,
        mobilePrimary: true,
      },
      {
        label: "Uloge zaposlenih",
        href: "/kuhinja/zaposleni",
        icon: Users,
        allowedRoles: ["moderator"],
      },
      {
        label: "Dnevnik",
        href: "/kuhinja/dnevnik",
        icon: History,
        allowedRoles: ["moderator"],
      },
      {
        label: "Knjiga utisaka",
        href: "/kuhinja/utisci",
        icon: MessageSquareText,
      },
    ],
  },
  {
    id: "counter",
    label: "Šalter",
    allowedRoles: ["moderator", "salter"],
    items: [
      { label: "Šalter", href: "/kuhinja/narudzbine", icon: ListOrdered, mobilePrimary: true },
      {
        label: "Vraćanje žetona",
        href: "/kuhinja/vracanje-zetona",
        icon: Ticket,
        mobilePrimary: true,
      },
    ],
  },
  {
    id: "kitchen",
    label: "Kuhinja",
    allowedRoles: ["moderator", "kuvar"],
    items: [
      {
        label: "Jelovnik",
        href: "/kuhinja/jelovnik",
        icon: UtensilsCrossed,
        allowedRoles: ["moderator"],
        mobilePrimary: true,
      },
      { label: "Priprema", href: "/kuhinja/priprema", icon: ClipboardList, mobilePrimary: true },
      {
        label: "Nabavka i magacin",
        href: "/kuhinja/nabavka",
        icon: Warehouse,
        allowedRoles: ["moderator", "kuvar"],
      },
    ],
  },
];

export const kitchenNavItems: KitchenNavItem[] = kitchenNavGroups.flatMap((group) => group.items);

export const referentNavItems: StaffNavItem[] = [
  { label: "Pregled", href: "/referent", icon: LayoutDashboard, mobilePrimary: true },
  {
    label: "Aktivacija",
    href: "/referent/aktivacija",
    icon: UserCheck,
    badgeKey: "pendingActivations",
    mobilePrimary: true,
  },
  { label: "Kartice", href: "/referent/kartice", icon: Search, mobilePrimary: true },
  { label: "Zahtevi", href: "/referent/zahtevi", icon: MessageSquareText, badgeKey: "pendingProfileRequests", mobilePrimary: true },
  { label: "Obaveštenja", href: "/referent/obavestenja", icon: Megaphone, mobilePrimary: true },
  { label: "Istorija", href: "/referent/istorija", icon: History },
];

export const panelLabels: Record<StaffPanel, string> = {
  admin: "Admin panel",
  kitchen: "Kuhinja panel",
  referent: "Referent panel",
};

export function getNavItemsForPanel(panel: StaffPanel): StaffNavItem[] {
  if (panel === "admin") return adminNavItems;
  if (panel === "kitchen") return kitchenNavItems;
  return referentNavItems;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/kuhinja" || href === "/referent") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}
