import type { Guest } from "@/types";
import { requireUser } from "./_internal";
import { http } from "./http";

/** Guests are built from bookings by the server (grouped by email). GET …/riadna/guests */
export async function getGuests(): Promise<Guest[]> {
  return http<Guest[]>(`/applications/${requireUser().riadId}/riadna/guests`);
}
