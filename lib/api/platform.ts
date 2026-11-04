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

/** GET/PATCH /applications/:riadId/riadna/riad: the application plus the riad's profile. */
export interface PlatformRiad extends PlatformApplication {
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  touristTaxPerAdultPerNight: number;
  tagline: string;
  about: string;
  highlights: string[];
  heroImage: string | null;
  isPublished: boolean;
}

/**
 * Builds the riad from either response. A bare application (login, logo upload) only
 * carries name, slug and logo, so the other fields are kept from `previous`.
 */
export function toRiad(app: PlatformApplication | PlatformRiad, previous?: Riad | null): Riad {
  const base: Riad = {
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
  if (!("checkInTime" in app)) return base;

  return {
    ...base,
    address: app.address,
    city: app.city,
    phone: app.phone,
    whatsapp: app.whatsapp,
    latitude: app.latitude ?? undefined,
    longitude: app.longitude ?? undefined,
    checkInTime: app.checkInTime,
    checkOutTime: app.checkOutTime,
    cancellationPolicy: app.cancellationPolicy,
    touristTaxPerAdultPerNight: app.touristTaxPerAdultPerNight,
    tagline: app.tagline,
    about: app.about,
    highlights: app.highlights,
    heroImage: app.heroImage ?? undefined,
    isPublished: app.isPublished,
  };
}
