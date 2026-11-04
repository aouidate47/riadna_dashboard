/** ADMIN is accepted by platform-api; in the dashboard it works like STAFF. */
export type TeamRole = "OWNER" | "ADMIN" | "STAFF";

/** Matches platform-api: GET /applications/:riadId/riadna/users */
export interface TeamMember {
  id: string; // the user's id
  email: string;
  firstName: string;
  lastName: string | null;
  name: string;
  role: TeamRole;
  mustChangePassword: boolean; // true until they replace their temporary password
  joinedAt: string;
}
