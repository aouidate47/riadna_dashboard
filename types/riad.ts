/** Matches platform-api: GET /applications/:riadId/riadna/riad */
export interface Riad {
  id: string;
  name: string; // "Riad Yasmine"
  slug: string; // "riad-yasmine", also its URL on the booking site
  logo?: string;

  // Contact & location
  address: string;
  city?: string; // "Marrakech"
  phone: string;
  whatsapp?: string; // digits only, international format: "212600000000"
  latitude?: number;
  longitude?: number;

  // Stay rules
  checkInTime: string; // "14:00"
  checkOutTime: string; // "11:00"
  cancellationPolicy?: string;
  touristTaxPerAdultPerNight?: number; // MAD, children are exempt

  // Booking site landing page
  tagline?: string;
  about?: string;
  highlights?: string[]; // up to 6 short items, e.g. "Pool courtyard"
  heroImage?: string; // URL; set with uploadRiadHeroImage()
  isPublished?: boolean; // false = hidden from the booking site
}
