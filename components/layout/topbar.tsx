"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";
import { getNotifications } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { initials } from "@/lib/utils";
import { SidebarContent } from "./sidebar";
import { titleForPath } from "./nav-items";
import type { AppNotification } from "@/types";

export function Topbar() {
  const { user, riad, logout, applications, switchRiad } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getNotifications()
      .then((list) => {
        if (!cancelled) setNotifications(list);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, riad?.id]);

  const unread = notifications.filter((item) => !readIds.has(item.id)).length;

  function openNotification(item: AppNotification) {
    setReadIds((current) => new Set(current).add(item.id));
    router.push(item.href);
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Pages of the dashboard</SheetDescription>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold">{titleForPath(pathname)}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">{format(new Date(), "EEEE d MMMM yyyy")}</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
              >
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unread > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-normal text-muted-foreground hover:text-foreground"
                    onClick={() => setReadIds(new Set(notifications.map((item) => item.id)))}
                  >
                    Mark all read
                  </button>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
              ) : (
                notifications.slice(0, 8).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => openNotification(item)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <span className="flex w-full items-center gap-2">
                      {!readIds.has(item.id) ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                      <span className="truncate font-medium">{item.title}</span>
                    </span>
                    <span className="truncate pl-3.5 text-xs text-muted-foreground">{item.description}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-muted"
                aria-label="Account menu"
              >
                <span className="brand-gradient flex size-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{user.role === "OWNER" ? "Owner" : "Staff"}</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                {riad && <span className="mt-1 block text-xs font-normal text-muted-foreground">{riad.name}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {applications.length > 1 ? (
                <>
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Switch riad</DropdownMenuLabel>
                  {applications.map((application) => (
                    <DropdownMenuItem
                      key={application.id}
                      disabled={application.id === riad?.id}
                      onSelect={() => void switchRiad(application.id)}
                    >
                      <span className="flex-1 truncate">{application.name}</span>
                      {application.id === riad?.id ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onSelect={() => router.push("/profile")}>
                <UserRound />
                My profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
