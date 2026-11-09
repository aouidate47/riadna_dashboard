export type PaymentMethod = "cash" | "card" | "transfer" | "online";

export interface Payment {
  id: string;
  bookingId: string;
  amount: number; // MAD, whole dirhams
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}

export type HousekeepingStatus = "clean" | "dirty" | "inspected";

export interface HousekeepingRow {
  roomId: string;
  status: HousekeepingStatus;
  updatedAt: string;
}

export type MaintenancePriority = "low" | "normal" | "urgent";
export type MaintenanceStatus = "open" | "done";

export interface MaintenanceTask {
  id: string;
  riadId: string;
  roomId: string;
  title: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: string;
}

export type MessageChannel = "email" | "whatsapp";
export type MessageTemplateId = "confirmation" | "pre-arrival" | "checkout" | "custom";

export interface MessageLog {
  id: string;
  riadId: string;
  guestName: string;
  email: string;
  phone: string;
  channel: MessageChannel;
  template: MessageTemplateId;
  body: string;
  createdAt: string;
}

export type NotificationKind = "arrival" | "departure" | "payment" | "housekeeping" | "maintenance";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href: string;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  riadId: string;
  code: string;
  percent: number;
  isActive: boolean;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  riadId: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
}

export type CheckInIdType = "passport" | "national-id" | "driver-license";

export interface CheckInRecord {
  bookingId: string;
  idType: CheckInIdType;
  idNumber: string;
  checkedInAt: string;
}
