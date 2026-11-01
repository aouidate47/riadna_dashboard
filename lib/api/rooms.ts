import type { BlockedPeriod, Room } from "@/types";
import { db } from "@/lib/mock/db";
import { clone, delay, findConflict, requireUser } from "./_internal";
import { publishAdminAvailability } from "./external-bookings";
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

// ─── Blocked periods: still mock data until platform-api has them ────────────

export async function getBlockedPeriods(roomId?: string): Promise<BlockedPeriod[]> {
  const { riadId } = requireUser();
  await delay();
  return clone(db.blocks.filter((b) => b.riadId === riadId && (!roomId || b.roomId === roomId)));
}

export async function createBlockedPeriod(input: Omit<BlockedPeriod, "id" | "riadId">): Promise<BlockedPeriod> {
  const { riadId } = requireUser();
  await delay();
  // Rooms now live in platform-api, so the room id is not checked against the mock data here.
  if (input.from >= input.to) throw new ApiError("VALIDATION", "End date must be after start date");
  if (findConflict(riadId, input.roomId, input.from, input.to)) throw new ApiError("CONFLICT", "Dates overlap an existing booking or block");
  const block: BlockedPeriod = { ...input, id: `${riadId}_block_${Date.now().toString(36)}`, riadId };
  db.blocks.push(block);
  await publishAdminAvailability();
  return clone(block);
}

export async function deleteBlockedPeriod(id: string): Promise<void> {
  const { riadId } = requireUser();
  await delay();
  const i = db.blocks.findIndex((b) => b.id === id && b.riadId === riadId);
  if (i === -1) throw new ApiError("NOT_FOUND", "Blocked period not found");
  db.blocks.splice(i, 1);
  await publishAdminAvailability();
}
