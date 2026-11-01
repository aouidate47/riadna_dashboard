import type { Riad, User, UserRole } from "@/types";
import { session } from "@/lib/auth/session";
import { db } from "@/lib/mock/db";
import { clone, delay, requireOwner, requireUser } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";
import { toRiad, type PlatformApplication } from "./platform";

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Keeps the local-only riad fields and stores the result in the session. */
function saveRiad(app: PlatformApplication, localPatch: Partial<Riad> = {}): Riad {
  const riad = toRiad(app, { ...session.get()?.riad, ...localPatch } as Riad);
  session.update({ riad });
  return clone(riad);
}

/** GET /applications/:riadId */
export async function getCurrentRiad(): Promise<Riad> {
  const { riadId } = requireUser();
  return saveRiad(await http<PlatformApplication>(`/applications/${riadId}`));
}

/**
 * OWNER only (the /settings page).
 * Only `name` is saved to platform-api (PATCH /applications/:riadId). The other fields
 * (address, phone, times, location, about) stay in memory until the backend stores them.
 */
export async function updateRiad(patch: Partial<Omit<Riad, "id" | "slug" | "logo">>): Promise<Riad> {
  const { riadId } = requireOwner();
  if (patch.latitude != null && (patch.latitude < -90 || patch.latitude > 90)) {
    throw new ApiError("VALIDATION", "Invalid latitude");
  }
  if (patch.longitude != null && (patch.longitude < -180 || patch.longitude > 180)) {
    throw new ApiError("VALIDATION", "Invalid longitude");
  }

  const { name, ...localPatch } = patch;
  const nameChanged = name !== undefined && name !== session.get()?.riad.name;

  const app = nameChanged
    ? await http<PlatformApplication>(`/applications/${riadId}`, { method: "PATCH", body: JSON.stringify({ name }) })
    : await http<PlatformApplication>(`/applications/${riadId}`);

  return saveRiad(app, localPatch);
}

/** OWNER only. POST /applications/:riadId/logo (multipart, field "file"). */
export async function uploadRiadLogo(file: File): Promise<Riad> {
  const { riadId } = requireOwner();
  if (!LOGO_TYPES.includes(file.type)) throw new ApiError("VALIDATION", "Logo must be a PNG, JPEG or WebP image");
  if (file.size > LOGO_MAX_BYTES) throw new ApiError("VALIDATION", "Logo must be 2 MB or smaller");

  const body = new FormData();
  body.append("file", file);
  return saveRiad(await http<PlatformApplication>(`/applications/${riadId}/logo`, { method: "POST", body }));
}

/** OWNER only. PATCH /applications/:riadId with logoUrl: null. */
export async function removeRiadLogo(): Promise<Riad> {
  const { riadId } = requireOwner();
  return saveRiad(
    await http<PlatformApplication>(`/applications/${riadId}`, { method: "PATCH", body: JSON.stringify({ logoUrl: null }) }),
  );
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
