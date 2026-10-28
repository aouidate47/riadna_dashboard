export interface Room {
  id: string;
  riadId: string;
  name: string; // e.g. "Chambre Jasmin"
  capacity: number;
  price: number; // per night, MAD
  photos: string[];
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
