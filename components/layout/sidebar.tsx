"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useNewBookings } from "@/components/providers/new-bookings-provider";
import { cn } from "@/lib/utils";
import { navForRole } from "./nav-items";

/**
 * `onNavigate` lets the mobile drawer close itself after a link is followed.
 * `compact` renders the icon-only desktop rail.
 */
export function SidebarContent({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { user, riad } = useAuth();
  const { count: newBookings } = useNewBookings();
  const pathname = usePathname();
  const items = navForRole(user?.role);

  return (
    <div className="brand-gradient flex h-full flex-col text-white/90">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/20",
          compact ? "justify-center px-2" : "gap-3 px-5",
        )}
      >
        <Image src="/riadna-logo.png" alt="Riadna" width={500} height={500} priority className="h-12 w-auto shrink-0" />
        {compact ? null : (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-base font-semibold text-white">{riad?.name ?? "Riadna"}</p>
          </div>
        )}
      </div>

      <nav aria-label="Main" className={cn("flex-1 overflow-y-auto py-4", compact ? "px-2" : "px-3")}>
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            // New website bookings waiting to be confirmed
            const badge = href === "/bookings" && newBookings ? newBookings : 0;
            const badgeText = badge > 99 ? "99+" : String(badge);
            const fullLabel = badge ? `${label} (${badge} new online)` : label;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={compact || badge ? fullLabel : undefined}
                  title={compact ? fullLabel : undefined}
                  className={cn(
                    "relative flex items-center rounded-md text-sm font-medium transition-colors hover:bg-white/15 hover:text-white",
                    compact ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                    active && "bg-white/20 text-white",
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-white" />}
                  <Icon className="size-[18px] shrink-0" />
                  {compact ? <span className="sr-only">{label}</span> : label}
                  {badge ? (
                    <span
                      aria-hidden
                      className={cn(
                        "rounded-full bg-white px-1.5 text-[10px] font-semibold leading-4 text-primary tabular-nums",
                        compact ? "absolute right-2 top-1 min-w-4 text-center" : "ml-auto",
                      )}
                    >
                      {badgeText}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 lg:block">
      <SidebarContent compact />
    </aside>
  );
}
