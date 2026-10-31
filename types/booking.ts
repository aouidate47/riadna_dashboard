export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type BookingSource = "direct" | "booking.com" | "airbnb.com" | "riadna.ma" | "phone" | "walk-in";

export interface Booking {
  id: string;
  code?: string;
  riadId: string;
  roomId: string;
  guestName: string;
  email: string;
  phone: string;
  country: string;
  guests: number;
  checkIn: string; 
  checkOut: string; 
  status: BookingStatus;
  source: BookingSource;
  total: number;
  paid: number;
  notes?: string;
  createdAt: string;
}
