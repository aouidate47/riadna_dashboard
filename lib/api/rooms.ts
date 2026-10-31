import type { BlockedPeriod, Room } from "@/types";
import { db } from "@/lib/mock/db";
import { clone, delay, findConflict, requireUser } from "./_internal";
import { publishAdminAvailability } from "./external-bookings";
import { ApiError } from "./errors";

export async function getRooms(): Promise<Room[]> {
  const { riadId } = requireUser();
  await delay();
  return clone(db.rooms.filter((r) => r.riadId === riadId));
}

export async function getRoom(id: string): Promise<Room> {
  const { riadId } = requireUser();
  await delay();
  const r = db.rooms.find((x) => x.id === id && x.riadId === riadId);
  if (!r) throw new ApiError("NOT_FOUND", "Room not found");
  return clone(r);
}

function validateRoomPhotos(photos: string[] | undefined) {
  if (photos && photos.length > 4) throw new ApiError("VALIDATION", "A room can have at most 4 photos");
}

export async function createRoom(input: Omit<Room, "id" | "riadId">): Promise<Room> {
  const { riadId } = requireUser();
  await delay();
  if (!input.name.trim() || input.capacity < 1 || input.price < 0) throw new ApiError("VALIDATION", "Invalid room data");
  validateRoomPhotos(input.photos);
  const room: Room = { ...input, id: `${riadId}_room_${Date.now().toString(36)}`, riadId };
  db.rooms.push(room);
  return clone(room);
}

export async function updateRoom(id: string, patch: Partial<Omit<Room, "id" | "riadId">>): Promise<Room> {
  const { riadId } = requireUser();
  await delay();
  const r = db.rooms.find((x) => x.id === id && x.riadId === riadId);
  if (!r) throw new ApiError("NOT_FOUND", "Room not found");
  validateRoomPhotos(patch.photos);
  Object.assign(r, patch);
  return clone(r);
}

export async function getBlockedPeriods(roomId?: string): Promise<BlockedPeriod[]> {
  const { riadId } = requireUser();
  await delay();
  return clone(db.blocks.filter((b) => b.riadId === riadId && (!roomId || b.roomId === roomId)));
}

export async function createBlockedPeriod(input: Omit<BlockedPeriod, "id" | "riadId">): Promise<BlockedPeriod> {
  const { riadId } = requireUser();
  await delay();
  if (!db.rooms.some((r) => r.id === input.roomId && r.riadId === riadId)) throw new ApiError("NOT_FOUND", "Room not found");
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
