import type { Riad, User } from "@/types";
import { session } from "@/lib/auth/session";
import { db } from "@/lib/mock/db";
import { MOCK_USERS } from "@/lib/mock/data";
import { clone, delay } from "./_internal";
import { ApiError } from "./errors";

/** LATER: POST /auth/login -> { token, user, riad }. */
export async function login(email: string, password: string): Promise<{ user: User; riad: Riad }> {
  await delay();
  const record = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!record || record.password !== password) throw new ApiError("UNAUTHORIZED", "Invalid email or password");
  const riad = db.riads.find((r) => r.id === record.riadId);
  if (!riad) throw new ApiError("NOT_FOUND", "Riad not found");
  const { password: _pw, ...user } = record;
  session.set({ user: clone(user), riad: clone(riad) });
  return { user: clone(user), riad: clone(riad) };
}

export async function logout(): Promise<void> {
  session.clear();
}

/** Mock-only helper for the "Demo accounts" box on /login. Delete when the real backend arrives. */
export function getDemoAccounts() {
  return MOCK_USERS.map((u) => ({
    email: u.email,
    password: u.password,
    role: u.role,
    riadName: db.riads.find((r) => r.id === u.riadId)?.name ?? "",
  }));
}
