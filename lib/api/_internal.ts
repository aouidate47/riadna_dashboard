import { session } from "@/lib/auth/session";
import { ApiError } from "./errors";

/** Fake network latency for the remaining mock calls (browser only, so Node tests stay instant). */
export const delay = (ms = 120) =>
  typeof window === "undefined" ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms + Math.random() * 120));

/** Mock DB returns copies, like a real API would. */
export const clone = <T,>(v: T): T => structuredClone(v);

/** The signed-in user (their riadId builds the API paths). Throws if logged out. */
export function requireUser() {
  const s = session.get();
  if (!s) throw new ApiError("UNAUTHORIZED", "You must be logged in");
  return s.user;
}

export function requireOwner() {
  const u = requireUser();
  if (u.role !== "OWNER") throw new ApiError("FORBIDDEN", "Owner access required");
  return u;
}
