import type { TeamMember, TeamRole } from "@/types";
import { requireOwner } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";

/** Owners only. Everything lives under …/riadna/users; `id` is the user's id. */
const teamPath = () => `/applications/${requireOwner().riadId}/riadna/users`;

/** GET …/users: owners first, then by name. */
export async function getTeam(): Promise<TeamMember[]> {
  return http<TeamMember[]>(teamPath());
}

export interface TeamMemberInput {
  name: string;
  email: string;
  role: TeamRole;
  temporaryPassword: string;
}

/**
 * POST …/users. A new email gets an account with this temporary password (changed at first login).
 * An email that already has an account (e.g. from another riad) is just added: `existingAccount`
 * is true and they keep their own password.
 */
export async function addTeamMember(input: TeamMemberInput): Promise<TeamMember & { existingAccount: boolean }> {
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const email = input.email.trim().toLowerCase();
  if (!firstName) throw new ApiError("VALIDATION", "Enter the team member's name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("VALIDATION", "Enter a valid email address");
  if (input.temporaryPassword.length < 8) throw new ApiError("VALIDATION", "Password must be at least 8 characters");

  return http(teamPath(), {
    method: "POST",
    body: JSON.stringify({
      email,
      firstName,
      lastName: rest.join(" ") || undefined,
      role: input.role,
      temporaryPassword: input.temporaryPassword,
    }),
  });
}

/** PATCH …/users/:userId. You can't change your own role. */
export async function updateTeamMemberRole(userId: string, role: TeamRole): Promise<TeamMember> {
  return http<TeamMember>(`${teamPath()}/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
}

/** DELETE …/users/:userId: ends their access to this riad only (account and bookings stay). */
export async function removeTeamMember(userId: string): Promise<void> {
  await http<TeamMember>(`${teamPath()}/${userId}`, { method: "DELETE" });
}
