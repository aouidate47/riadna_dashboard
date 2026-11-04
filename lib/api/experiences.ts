import type { Experience, ExperiencePricing } from "@/types";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/prepare-image";
import { requireUser } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";

/** Fields you can send when creating/updating an experience. */
export interface ExperienceInput {
  name: string;
  description: string;
  price: number;
  pricing: ExperiencePricing;
  isActive: boolean;
}

const experiencesPath = () => `/applications/${requireUser().riadId}/riadna/experiences`;

/** GET …/experiences — every experience, in catalog order (active and hidden). */
export async function getExperiences(): Promise<Experience[]> {
  return http<Experience[]>(experiencesPath());
}

export async function getExperience(id: string): Promise<Experience> {
  return http<Experience>(`${experiencesPath()}/${id}`);
}

/** POST …/experiences — goes to the end of the list. */
export async function createExperience(input: ExperienceInput): Promise<Experience> {
  return http<Experience>(experiencesPath(), { method: "POST", body: JSON.stringify(input) });
}

/** PATCH …/experiences/:id */
export async function updateExperience(id: string, patch: Partial<ExperienceInput>): Promise<Experience> {
  return http<Experience>(`${experiencesPath()}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** DELETE …/experiences/:id */
export async function deleteExperience(id: string): Promise<void> {
  await http<Experience>(`${experiencesPath()}/${id}`, { method: "DELETE" });
}

/** POST …/experiences/:id/image — replaces the image (stored on IDrive) and returns the experience. */
export async function uploadExperienceImage(id: string, file: File): Promise<Experience> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new ApiError("VALIDATION", `"${file.name}" must be a PNG, JPEG or WebP image`);
  }
  if (file.size > IMAGE_MAX_BYTES) throw new ApiError("VALIDATION", `"${file.name}" is larger than 5 MB`);

  const body = new FormData();
  body.append("file", file);
  return http<Experience>(`${experiencesPath()}/${id}/image`, { method: "POST", body });
}

/** DELETE …/experiences/:id/image — removes the image and its file. */
export async function removeExperienceImage(id: string): Promise<Experience> {
  return http<Experience>(`${experiencesPath()}/${id}/image`, { method: "DELETE" });
}

/** PATCH …/experiences/reorder — `experienceIds` must list every experience, in the new order. */
export async function reorderExperiences(experienceIds: string[]): Promise<Experience[]> {
  return http<Experience[]>(`${experiencesPath()}/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ experienceIds }),
  });
}
