import type { Riad, User } from "@/types";

/**
 * In-memory session (lost on refresh, as requested).
 * LATER: keep the JWT in an httpOnly cookie instead of memory.
 */
export interface Session {
  token: string;
  user: User;
  riad: Riad;
  /** True while the user still has the temporary password their admin gave them. */
  mustChangePassword: boolean;
}

let current: Session | null = null;

export const session = {
  get: () => current,
  set: (s: Session) => {
    current = s;
  },
  /** Merge changes into the current session (no-op when logged out). */
  update: (patch: Partial<Session>) => {
    if (current) current = { ...current, ...patch };
  },
  clear: () => {
    current = null;
  },
};
