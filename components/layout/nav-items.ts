import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ClipboardList,
  History,
  LayoutDashboard,
  MessageSquare,
  Percent,
  Settings,
  Sparkles,
  Users,
  Wrench,
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
  { href: "/housekeeping", label: "Housekeeping", icon: Wrench },
  { href: "/experiences", label: "Experiences", icon: Sparkles },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/rates", label: "Rates & promos", icon: Percent, roles: ["OWNER"] },
  { href: "/activity", label: "Activity", icon: History, roles: ["OWNER"] },
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
