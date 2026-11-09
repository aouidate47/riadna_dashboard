import type { Riad, User } from "@/types";
import { session } from "@/lib/auth/session";
import { ApiError } from "./errors";
import { http } from "./http";
import {
  pickMembership,
  toRiad,
  toUser,
  type LoginResponse,
  type PlatformApplication,
  type PlatformProfile,
} from "./platform";
import { getCurrentRiad } from "./riad";

/** POST /auth/login, then GET /auth/profile to find the user's riad. */
export async function login(email: string, password: string): Promise<{ user: User; riad: Riad; mustChangePassword: boolean }> {
  const { accessToken, mustChangePassword } = await http<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const profile = await http<PlatformProfile>("/auth/profile", { token: accessToken });

  const entry = pickMembership(profile);
  if (!entry) throw new ApiError("FORBIDDEN", "This account is not linked to any riad yet");

  const user = toUser(profile, entry);
  session.set({ token: accessToken, user, riad: toRiad(entry.application), mustChangePassword });

  // The profile only carries name/slug/logo; load the riad's details too (check-in time, etc.).
  const riad = await getCurrentRiad().catch(() => session.get()!.riad);
  return { user, riad, mustChangePassword };
}

export async function logout(): Promise<void> {
  session.clear();
}

export interface MyProfile {
  firstName: string;
  lastName: string;
  email: string;
  mustChangePassword: boolean;
}

const toMyProfile = (profile: PlatformProfile): MyProfile => ({
  firstName: profile.user.firstName,
  lastName: profile.user.lastName ?? "",
  email: profile.user.email,
  mustChangePassword: profile.user.mustChangePassword,
});

/** Writes the fresh profile into the session so the topbar shows the new name. */
function syncSessionUser(profile: PlatformProfile) {
  const current = session.get();
  const entry = pickMembership(profile, current?.riad.id);
  if (entry) session.update({ user: toUser(profile, entry) });
}

/** GET /auth/profile — the signed-in user's own details. */
export async function getMyProfile(): Promise<MyProfile> {
  const profile = await http<PlatformProfile>("/auth/profile");
  syncSessionUser(profile);
  return toMyProfile(profile);
}

/** PATCH /auth/profile — an empty lastName clears it. */
export async function updateMyProfile(input: { firstName: string; lastName: string }): Promise<MyProfile> {
  const firstName = input.firstName.trim();
  if (!firstName) throw new ApiError("VALIDATION", "Enter your first name");

  const profile = await http<PlatformProfile>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ firstName, lastName: input.lastName.trim() }),
  });
  syncSessionUser(profile);
  return toMyProfile(profile);
}

/** POST /auth/change-password */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new ApiError("VALIDATION", "New password must be at least 8 characters");

  await http<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  session.update({ mustChangePassword: false });
}

/** Every riad the signed-in user can switch to. GET /auth/profile */
export async function getApplications(): Promise<PlatformApplication[]> {
  const profile = await http<PlatformProfile>("/auth/profile");
  return profile.applications.map((entry) => entry.application);
}

/** POST /auth/switch-riad — demo helper: re-points the session at another riad. */
export async function switchRiad(riadId: string): Promise<{ user: User; riad: Riad }> {
  const { user, riad } = await http<{ user: User; riad: Riad }>("/auth/switch-riad", {
    method: "POST",
    body: JSON.stringify({ riadId }),
  });
  session.update({ user, riad });
  return { user, riad };
}

/** POST /auth/forgot-password — always resolves with the same message (no account enumeration). */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return http<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function getTwoFactor(): Promise<{ enabled: boolean }> {
  return http<{ enabled: boolean }>("/auth/2fa");
}

export async function setTwoFactor(enabled: boolean): Promise<{ enabled: boolean }> {
  return http<{ enabled: boolean }>("/auth/2fa", { method: "POST", body: JSON.stringify({ enabled }) });
}
