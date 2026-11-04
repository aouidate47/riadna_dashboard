import type { Riad } from "@/types";
import { session } from "@/lib/auth/session";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/prepare-image";
import { clone, requireOwner, requireUser } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";
import { toRiad, type PlatformApplication, type PlatformRiad } from "./platform";

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const riadPath = () => `/applications/${requireUser().riadId}/riadna/riad`;

/** Stores the riad in the session (the topbar reads it from there). */
function saveRiad(app: PlatformApplication | PlatformRiad): Riad {
  const riad = toRiad(app, session.get()?.riad);
  session.update({ riad });
  return clone(riad);
}

/** GET …/riadna/riad: name, slug, logo and the riad's profile. */
export async function getCurrentRiad(): Promise<Riad> {
  return saveRiad(await http<PlatformRiad>(riadPath()));
}

export type RiadInput = Partial<Omit<Riad, "id" | "slug" | "logo" | "heroImage" | "latitude" | "longitude">> & {
  latitude?: number | null;
  longitude?: number | null;
};

/** OWNER/ADMIN. PATCH …/riadna/riad: send only what changed; null latitude + longitude clears the pin. */
export async function updateRiad(patch: RiadInput): Promise<Riad> {
  requireOwner();
  if (patch.latitude != null && (patch.latitude < -90 || patch.latitude > 90)) {
    throw new ApiError("VALIDATION", "Invalid latitude");
  }
  if (patch.longitude != null && (patch.longitude < -180 || patch.longitude > 180)) {
    throw new ApiError("VALIDATION", "Invalid longitude");
  }

  return saveRiad(await http<PlatformRiad>(riadPath(), { method: "PATCH", body: JSON.stringify(patch) }));
}

/** OWNER/ADMIN. POST …/riadna/riad/hero-image (multipart "file"): the booking site's landing photo. */
export async function uploadRiadHeroImage(file: File): Promise<Riad> {
  requireOwner();
  if (!IMAGE_TYPES.includes(file.type)) throw new ApiError("VALIDATION", "The photo must be a PNG, JPEG or WebP image");
  if (file.size > IMAGE_MAX_BYTES) throw new ApiError("VALIDATION", "The photo must be 5 MB or smaller");

  const body = new FormData();
  body.append("file", file);
  return saveRiad(await http<PlatformRiad>(`${riadPath()}/hero-image`, { method: "POST", body }));
}

/** OWNER/ADMIN. DELETE …/riadna/riad/hero-image */
export async function removeRiadHeroImage(): Promise<Riad> {
  requireOwner();
  return saveRiad(await http<PlatformRiad>(`${riadPath()}/hero-image`, { method: "DELETE" }));
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
