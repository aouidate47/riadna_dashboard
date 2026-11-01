import type { BlockedPeriod, Room } from "@/types";
import { requireUser } from "./_internal";
import { ApiError } from "./errors";
import { http } from "./http";

/** Same limits as platform-api. */
export const ROOM_MAX_PHOTOS = 10;
export const ROOM_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ROOM_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Fields you can send when creating/updating a room. */
export interface RoomInput {
  name: string;
  description: string;
  capacity: number;
  beds: string;
  size: number;
  price: number;
  amenities: string[];
  isActive: boolean;
  /** Reorder or drop photos (dropped files are deleted). Upload new ones with uploadRoomPhoto(). */
  photos?: string[];
  sortOrder?: number;
}

const roomsPath = () => `/applications/${requireUser().riadId}/riadna/rooms`;

/** GET …/rooms — every room of the riad, in display order (active and hidden). */
export async function getRooms(): Promise<Room[]> {
  return http<Room[]>(roomsPath());
}

export async function getRoom(id: string): Promise<Room> {
  return http<Room>(`${roomsPath()}/${id}`);
}

/** POST …/rooms — the new room goes to the end of the list. */
export async function createRoom(input: RoomInput): Promise<Room> {
  return http<Room>(roomsPath(), { method: "POST", body: JSON.stringify(input) });
}

/** PATCH …/rooms/:id */
export async function updateRoom(id: string, patch: Partial<RoomInput>): Promise<Room> {
  return http<Room>(`${roomsPath()}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/** DELETE …/rooms/:id — also deletes its photo files. */
export async function deleteRoom(id: string): Promise<void> {
  await http<Room>(`${roomsPath()}/${id}`, { method: "DELETE" });
}

/** PATCH …/rooms/reorder — `roomIds` must list every room, in the new order. */
export async function reorderRooms(roomIds: string[]): Promise<Room[]> {
  return http<Room[]>(`${roomsPath()}/reorder`, { method: "PATCH", body: JSON.stringify({ roomIds }) });
}

/** POST …/rooms/:id/photos — adds the photo at the end and returns the updated room. */
export async function uploadRoomPhoto(id: string, file: File): Promise<Room> {
  if (!ROOM_PHOTO_TYPES.includes(file.type)) {
    throw new ApiError("VALIDATION", `"${file.name}" must be a PNG, JPEG or WebP image`);
  }
  if (file.size > ROOM_PHOTO_MAX_BYTES) throw new ApiError("VALIDATION", `"${file.name}" is larger than 5 MB`);

  const body = new FormData();
  body.append("file", file);
  return http<Room>(`${roomsPath()}/${id}/photos`, { method: "POST", body });
}

/** DELETE …/rooms/:id/photos — removes one photo and deletes its file. */
export async function removeRoomPhoto(id: string, url: string): Promise<Room> {
  return http<Room>(`${roomsPath()}/${id}/photos`, { method: "DELETE", body: JSON.stringify({ url }) });
}

// ─── Blocked periods: dates a room can't be booked ───────────────────────────

const blockedPeriodsPath = () => `/applications/${requireUser().riadId}/riadna/blocked-periods`;

/** GET …/blocked-periods (optionally for one room). */
export async function getBlockedPeriods(roomId?: string): Promise<BlockedPeriod[]> {
  return http<BlockedPeriod[]>(blockedPeriodsPath() + (roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""));
}

/** POST …/blocked-periods — 409 if the dates overlap a booking or another block. */
export async function createBlockedPeriod(
  input: Pick<BlockedPeriod, "roomId" | "from" | "to"> & { reason?: string },
): Promise<BlockedPeriod> {
  if (input.from >= input.to) throw new ApiError("VALIDATION", "End date must be after start date");
  return http<BlockedPeriod>(blockedPeriodsPath(), { method: "POST", body: JSON.stringify(input) });
}

/** DELETE …/blocked-periods/:id */
export async function deleteBlockedPeriod(id: string): Promise<void> {
  await http<BlockedPeriod>(`${blockedPeriodsPath()}/${id}`, { method: "DELETE" });
}
