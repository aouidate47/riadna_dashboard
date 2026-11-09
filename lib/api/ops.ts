import type {
  ActivityEntry,
  AppNotification,
  CheckInRecord,
  HousekeepingRow,
  HousekeepingStatus,
  MaintenanceTask,
  MessageLog,
  Payment,
  PaymentMethod,
  PromoCode,
} from "@/types";
import { requireOwner, requireUser } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";

const base = () => `/applications/${requireUser().riadId}/riadna`;

// ------------------------------------------------------------------ payments

/** GET …/bookings/:id/payments */
export async function listPayments(bookingId: string): Promise<Payment[]> {
  return http<Payment[]>(`${base()}/bookings/${bookingId}/payments`);
}

export async function addPayment(
  bookingId: string,
  input: { amount: number; method: PaymentMethod; note?: string },
): Promise<Payment> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError("VALIDATION", "Enter a valid amount");
  }
  return http<Payment>(`${base()}/bookings/${bookingId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deletePayment(bookingId: string, paymentId: string): Promise<void> {
  await http<Payment>(`${base()}/bookings/${bookingId}/payments/${paymentId}`, { method: "DELETE" });
}

// ------------------------------------------------------------------- check-in

export async function checkInBooking(
  bookingId: string,
  input: { idType: CheckInRecord["idType"]; idNumber: string },
): Promise<{ booking: unknown; checkIn: CheckInRecord }> {
  if (!input.idNumber.trim()) throw new ApiError("VALIDATION", "Enter the guest's ID number");
  return http<{ booking: unknown; checkIn: CheckInRecord }>(`${base()}/bookings/${bookingId}/check-in`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------- housekeeping

export async function getHousekeeping(): Promise<HousekeepingRow[]> {
  return http<HousekeepingRow[]>(`${base()}/housekeeping`);
}

export async function setHousekeepingStatus(roomId: string, status: HousekeepingStatus): Promise<HousekeepingRow> {
  return http<HousekeepingRow>(`${base()}/housekeeping/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function listMaintenance(): Promise<MaintenanceTask[]> {
  return http<MaintenanceTask[]>(`${base()}/maintenance`);
}

export async function createMaintenance(input: {
  roomId: string;
  title: string;
  priority: MaintenanceTask["priority"];
}): Promise<MaintenanceTask> {
  if (!input.title.trim()) throw new ApiError("VALIDATION", "Describe the problem");
  return http<MaintenanceTask>(`${base()}/maintenance`, { method: "POST", body: JSON.stringify(input) });
}

export async function updateMaintenance(
  id: string,
  patch: Partial<Pick<MaintenanceTask, "status" | "priority" | "title">>,
): Promise<MaintenanceTask> {
  return http<MaintenanceTask>(`${base()}/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteMaintenance(id: string): Promise<void> {
  await http<MaintenanceTask>(`${base()}/maintenance/${id}`, { method: "DELETE" });
}

// -------------------------------------------------------------------- messages

export async function getMessageLog(): Promise<MessageLog[]> {
  return http<MessageLog[]>(`${base()}/messages`);
}

export async function sendGuestMessage(input: {
  guestName: string;
  email: string;
  phone: string;
  channel: MessageLog["channel"];
  template: MessageLog["template"];
  body: string;
}): Promise<MessageLog> {
  if (!input.body.trim()) throw new ApiError("VALIDATION", "Write a message first");
  return http<MessageLog>(`${base()}/messages`, { method: "POST", body: JSON.stringify(input) });
}

// ----------------------------------------------------------------- notifications

export async function getNotifications(): Promise<AppNotification[]> {
  return http<AppNotification[]>(`${base()}/notifications`);
}

// ----------------------------------------------------------------------- promos

export async function listPromoCodes(): Promise<PromoCode[]> {
  return http<PromoCode[]>(`${base()}/promos`);
}

export async function createPromoCode(input: { code: string; percent: number }): Promise<PromoCode> {
  requireOwner();
  if (!input.code.trim()) throw new ApiError("VALIDATION", "Enter a promo code");
  return http<PromoCode>(`${base()}/promos`, { method: "POST", body: JSON.stringify(input) });
}

export async function updatePromoCode(
  id: string,
  patch: Partial<Pick<PromoCode, "percent" | "isActive">>,
): Promise<PromoCode> {
  requireOwner();
  return http<PromoCode>(`${base()}/promos/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deletePromoCode(id: string): Promise<void> {
  requireOwner();
  await http<PromoCode>(`${base()}/promos/${id}`, { method: "DELETE" });
}

// --------------------------------------------------------------------- activity

export async function getActivity(): Promise<ActivityEntry[]> {
  requireOwner();
  return http<ActivityEntry[]>(`${base()}/activity`);
}
