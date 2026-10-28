import type { Riad, User } from "@/types";
import { session } from "@/lib/auth/session";
import { db } from "@/lib/mock/db";
import { clone, delay, requireOwner, requireUser } from "./_internal";
import { ApiError } from "./errors";

export async function getCurrentRiad(): Promise<Riad> {
  const { riadId } = requireUser();
  await delay();
  const r = db.riads.find((x) => x.id === riadId);
  if (!r) throw new ApiError("NOT_FOUND", "Riad not found");
  return clone(r);
}

/** OWNER only (the /settings page). */
export async function updateRiad(patch: Partial<Omit<Riad, "id" | "slug">>): Promise<Riad> {
  const { riadId } = requireOwner();
  await delay();
  const r = db.riads.find((x) => x.id === riadId);
  if (!r) throw new ApiError("NOT_FOUND", "Riad not found");
  Object.assign(r, patch);
  const s = session.get();
  if (s) session.set({ ...s, riad: clone(r) });
  return clone(r);
}

/** OWNER only: the staff list in /settings. */
export async function getStaffUsers(): Promise<User[]> {
  const { riadId } = requireOwner();
  await delay();
  return clone(db.users.filter((u) => u.riadId === riadId).map(({ password: _pw, ...u }) => u));
}
