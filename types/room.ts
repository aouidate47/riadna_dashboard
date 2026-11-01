/** Matches platform-api: GET /applications/:riadId/riadna/rooms */
export interface Room {
  id: string;
  riadId: string;

  // Shown on the booking site
  name: string; // e.g. "Chambre Jasmin"
  description: string;
  capacity: number; // max guests, adults + children
  beds: string; // e.g. "1 queen bed"
  size: number; // m²
  price: number; // per night, MAD, integer
  amenities: string[]; // e.g. ["Air conditioning", "Bathtub"]
  photos: string[]; // URLs, the first one is the main photo

  // Dashboard only
  isActive: boolean; // false = hidden from the booking site, can't be booked
  sortOrder: number; // order on the site and in the calendar rows
  createdAt: string;
  updatedAt: string;
}

/**
 * EXTRA (not in the original contract, needed by the "block dates" modal).
 * `from` inclusive, `to` exclusive: same semantics as checkIn/checkOut.
 * The backend needs a matching entity.
 */
export interface BlockedPeriod {
  id: string;
  riadId: string;
  roomId: string;
  from: string; // ISO date
  to: string; // ISO date
  reason?: string;
}
