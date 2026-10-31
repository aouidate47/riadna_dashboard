import type { Riad, User, UserRole } from "@/types";
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
  if (patch.latitude != null && (patch.latitude < -90 || patch.latitude > 90)) {
    throw new ApiError("VALIDATION", "Invalid latitude");
  }
  if (patch.longitude != null && (patch.longitude < -180 || patch.longitude > 180)) {
    throw new ApiError("VALIDATION", "Invalid longitude");
  }
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

export interface CreateTeamUserInput {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

/** OWNER only: add a teammate who can sign in to this riad. */
export async function createTeamUser(input: CreateTeamUserInput): Promise<User> {
  const { riadId } = requireOwner();
  await delay();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new ApiError("VALIDATION", "Enter the team member's name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("VALIDATION", "Enter a valid email address");
  if (input.password.length < 8) throw new ApiError("VALIDATION", "Password must be at least 8 characters");
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new ApiError("CONFLICT", "An account with this email already exists");
  }

  const record = {
    id: `u_${Date.now().toString(36)}`,
    riadId,
    name,
    email,
    role: input.role,
    password: input.password,
  };
  db.users.push(record);
  return clone({ id: record.id, riadId, name, email, role: record.role });
}
