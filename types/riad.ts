export interface Riad {
  id: string;
  name: string; // "Riad Yasmine"
  slug: string; // "riad-yasmine"
  logo?: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  checkInTime: string; // "14:00"
  checkOutTime: string; // "11:00"
  about?: string;
}
