"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import type { UserRole } from "@/types";

/**
 * Wrap the (dashboard) layout with it. Not logged in -> /login.
 * `roles` restricts a page (e.g. <AuthGuard roles={["OWNER"]}> on /settings) -> /dashboard.
 */
export function AuthGuard({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = !!user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (!allowed) router.replace("/dashboard");
  }, [user, allowed, router]);

  return allowed ? <>{children}</> : null;
}
