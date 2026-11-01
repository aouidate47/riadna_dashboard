export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type BookingSource = "direct" | "booking.com" | "airbnb.com" | "riadna.ma" | "phone" | "walk-in";

/** Matches platform-api: GET /applications/:riadId/riadna/bookings */
export interface Booking {
  id: string;
  code: string; // short reference for guests, e.g. "RDN-7K3F9Q"
  riadId: string;
  roomId: string;
  guestName: string;
  email: string;
  phone: string;
  country: string;
  guests: number;
  checkIn: string; // YYYY-MM-DD, first night
  checkOut: string; // YYYY-MM-DD, day the guest leaves
  status: BookingStatus;
  source: BookingSource;
  total: number; // MAD, whole dirhams
  paid: number; // MAD, whole dirhams
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}
