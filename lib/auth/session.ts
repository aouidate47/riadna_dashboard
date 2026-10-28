import type { Riad, User } from "@/types";

/**
 * In-memory session (lost on refresh, as requested).
 * LATER: replace with the JWT returned by NestJS (kept in an httpOnly cookie);
 * the API layer will then send it and the backend derives riadId from it.
 */
export interface Session {
  user: User;
  riad: Riad;
}

let current: Session | null = null;

export const session = {
  get: () => current,
  set: (s: Session) => {
    current = s;
  },
  clear: () => {
    current = null;
  },
};
