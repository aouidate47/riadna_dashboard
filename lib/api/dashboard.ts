import type { DashboardOverview, DashboardStats } from "@/types";
import { todayISO } from "@/lib/dates";
import { requireUser } from "./_internal";
import { http } from "./http";

/**
 * Everything the dashboard needs in one round trip. GET …/riadna/dashboard
 * Sends the browser's date as "today" so the numbers match the user's calendar.
 * revenueThisMonth is null for anyone but the owner.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  return http<DashboardOverview>(`/applications/${requireUser().riadId}/riadna/dashboard?today=${todayISO()}`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return (await getDashboardOverview()).stats;
}
