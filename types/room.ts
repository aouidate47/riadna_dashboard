export type BathroomType = "private" | "shared";

export interface Room {
  id: string;
  riadId: string;
  name: string; // e.g. "Chambre Jasmin"
  capacity: number;
  price: number; // per night, MAD
  photos: string[]; // up to 4, usually uploaded as data URLs
  wifi: boolean;
  bathroom: BathroomType;
  airConditioning: boolean;
  heating: boolean;
  breakfast: boolean;
  terrace: boolean;
  tv: boolean;
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
