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
  guests: number; // adults + children
  adults: number;
  children: number; // ages 2–12
  arrivalTime: string | null; // "HH:00", set by guests on the booking site
  specialRequests: string; // written by the guest ("" if none)
  checkIn: string; // YYYY-MM-DD, first night
  checkOut: string; // YYYY-MM-DD, day the guest leaves
  status: BookingStatus;
  source: BookingSource;
  total: number; // MAD, whole dirhams
  // Breakdown of `total` for website bookings. roomTotal is null for bookings typed in the dashboard.
  roomTotal: number | null;
  experiencesTotal: number;
  touristTax: number;
  experiences: BookingExperienceLine[]; // what the guest added, priced when they booked
  paid: number; // MAD, whole dirhams
  notes?: string | null; // staff only
  createdAt: string;
  updatedAt?: string;
}

/** A copy taken at booking time: editing or deleting the experience later doesn't change it. */
export interface BookingExperienceLine {
  id: string;
  experienceId: string | null; // null once the experience was deleted
  name: string;
  pricing: "per_person" | "per_booking";
  unitPrice: number;
  quantity: number;
  total: number;
}
