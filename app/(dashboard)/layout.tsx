import type { ReactNode } from "react";
import { AuthGuard } from "@/components/providers/auth-guard";
import { NewBookingsProvider } from "@/components/providers/new-bookings-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <NewBookingsProvider>
        <Sidebar />
        <div className="flex min-h-screen flex-col lg:pl-20">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </NewBookingsProvider>
    </AuthGuard>
  );
}
