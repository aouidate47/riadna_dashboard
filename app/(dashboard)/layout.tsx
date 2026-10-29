import type { ReactNode } from "react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
