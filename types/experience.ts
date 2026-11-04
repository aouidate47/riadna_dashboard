/** per_person: charged for every guest (children included). per_booking: once per stay. */
export type ExperiencePricing = "per_person" | "per_booking";

/** Matches platform-api: GET /applications/:riadId/riadna/experiences */
export interface Experience {
  id: string;
  riadId: string;

  // Shown on the booking site
  name: string; // e.g. "Hammam & massage"
  description: string;
  price: number; // MAD, whole dirhams
  pricing: ExperiencePricing;
  image: string | null; // URL; set with uploadExperienceImage()

  // Dashboard only
  isActive: boolean; // false = hidden from the booking site
  sortOrder: number; // catalog order on the booking site
  createdAt: string;
  updatedAt: string;
}
