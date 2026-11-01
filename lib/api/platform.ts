import type { Riad, User } from "@/types";

/** Response shapes from platform-api, and how they map onto the dashboard's own types. */

export interface PlatformApplication {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export type PlatformAppRole = "OWNER" | "ADMIN" | "DRIVER" | "STAFF" | "USER";

export interface PlatformProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    mustChangePassword: boolean;
  };
  applications: {
    membership: { role: PlatformAppRole };
    application: PlatformApplication;
  }[];
}

export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
}

/** The riad this session works on: where the person is OWNER, otherwise the first one they belong to. */
export function pickMembership(profile: PlatformProfile, riadId?: string) {
  const { applications } = profile;
  return (
    (riadId && applications.find((a) => a.application.id === riadId)) ||
    applications.find((a) => a.membership.role === "OWNER") ||
    applications[0]
  );
}

export function toUser(profile: PlatformProfile, entry: PlatformProfile["applications"][number]): User {
  return {
    id: profile.user.id,
    riadId: entry.application.id,
    name: [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" "),
    email: profile.user.email,
    role: entry.membership.role === "OWNER" ? "OWNER" : "STAFF",
  };
}

/**
 * platform-api only stores name, slug and logo. The other riad fields are kept from
 * `previous` (in memory) until the backend has columns for them.
 */
export function toRiad(app: PlatformApplication, previous?: Riad | null): Riad {
  return {
    address: "",
    phone: "",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    ...previous,
    id: app.id,
    name: app.name,
    slug: app.slug,
    logo: app.logoUrl ?? undefined,
  };
}
