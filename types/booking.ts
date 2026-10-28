export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type BookingSource = "direct" | "booking.com" | "airbnb" | "phone" | "walk-in";

export interface Booking {
  id: string;
  riadId: string;
  roomId: string;
  guestName: string;
  email: string;
  phone: string;
  country: string;
  guests: number;
  checkIn: string; // ISO date (YYYY-MM-DD), first night
  checkOut: string; // ISO date (YYYY-MM-DD), departure day (not a night)
  status: BookingStatus;
  source: BookingSource;
  total: number;
  paid: number;
  notes?: string;
  createdAt: string; // ISO datetime
}
