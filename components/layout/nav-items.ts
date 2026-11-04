import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Omit for every role. */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/rooms", label: "Rooms", icon: BedDouble },
  { href: "/experiences", label: "Experiences", icon: Sparkles },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["OWNER"] },
];

export function navForRole(role: UserRole | undefined) {
  return NAV_ITEMS.filter((i) => !i.roles || (role && i.roles.includes(role)));
}

/** Pages reached from the account menu, not the sidebar. */
const EXTRA_TITLES: Pick<NavItem, "href" | "label">[] = [{ href: "/profile", label: "My profile" }];

export function titleForPath(pathname: string) {
  return (
    [...NAV_ITEMS, ...EXTRA_TITLES].find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label ??
    "min"
  );
}
