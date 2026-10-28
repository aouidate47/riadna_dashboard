import assert from "node:assert/strict";
import * as api from "@/lib/api";
import { session } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";

let passed = 0;
const ok = (name: string) => { console.log(`  ✓ ${name}`); passed++; };
const rejects = async (p: Promise<unknown>, code: string) => {
  await assert.rejects(p, (e: unknown) => e instanceof ApiError && e.code === code);
};

async function snapshot(email: string) {
  await api.login(email, "test1234");
  const [rooms, bookings] = await Promise.all([api.getRooms(), api.getBookings()]);
  const riadId = session.get()!.user.riadId;
  return { riadId, rooms, bookings };
}

async function main() {
  console.log("Tenant isolation");
  await rejects(api.getBookings(), "UNAUTHORIZED");
  ok("logged out: getBookings is rejected");
  await rejects(api.login("owner@yasmine.ma", "wrong"), "UNAUTHORIZED");
  ok("wrong password is rejected");

  const y = await snapshot("owner@yasmine.ma");
  const a = await snapshot("owner@daranika.ma");
  const z = await snapshot("owner@riadzitoun.ma");
  for (const [label, s, rooms, bookings] of [["Riad Yasmine", y, [5, 8], [20, 30]], ["Dar Anika", a, [5, 8], [20, 30]], ["Riad Zitoun", z, [5, 8], [20, 30]]] as const) {
    assert.ok(s.rooms.length >= rooms[0] && s.rooms.length <= rooms[1]);
    assert.ok(s.bookings.length >= bookings[0] && s.bookings.length <= bookings[1]);
    assert.ok(s.rooms.every((r) => r.riadId === s.riadId));
    assert.ok(s.bookings.every((b) => b.riadId === s.riadId));
    const roomIds = new Set(s.rooms.map((r) => r.id));
    assert.ok(s.bookings.every((b) => roomIds.has(b.roomId)));
    ok(`${label}: ${s.rooms.length} rooms, ${s.bookings.length} bookings, all scoped to its riad`);
  }
  const ids = (s: typeof y) => [...s.rooms.map((r) => r.id), ...s.bookings.map((b) => b.id)];
  assert.equal(new Set([...ids(y), ...ids(a), ...ids(z)]).size, ids(y).length + ids(a).length + ids(z).length);
  assert.ok(!y.rooms.some((r) => a.rooms.some((x) => x.name === r.name)));
  ok("the 3 riads share no room, no booking, no room name");

  await api.login("owner@daranika.ma", "test1234");
  await rejects(api.getBooking(y.bookings[0].id), "NOT_FOUND");
  await rejects(api.updateBooking(y.bookings[0].id, { notes: "hack" }), "NOT_FOUND");
  await rejects(api.getRoom(y.rooms[0].id), "NOT_FOUND");
  ok("Dar Anika cannot read or edit Yasmine's records by id");

  console.log("Roles");
  await api.login("owner@yasmine.ma", "test1234");
  const ownerStats = await api.getDashboardStats();
  assert.equal(typeof ownerStats.revenueThisMonth, "number");
  assert.ok((await api.getStaffUsers()).length === 2);
  ok(`OWNER sees revenue (${ownerStats.revenueThisMonth} MAD) and staff list`);
  await api.login("staff@yasmine.ma", "test1234");
  assert.equal((await api.getDashboardStats()).revenueThisMonth, null);
  await rejects(api.getStaffUsers(), "FORBIDDEN");
  await rejects(api.updateRiad({ phone: "0" }), "FORBIDDEN");
  ok("STAFF: revenue is null, staff list and riad update are forbidden");
  assert.equal((await api.getBookings()).length, y.bookings.length);
  ok("STAFF sees the same riad data as its owner");

  console.log("Booking rules");
  await api.login("owner@yasmine.ma", "test1234");
  const live = (await api.getBookings()).filter((b) => b.status === "CONFIRMED");
  const [b1] = live;
  const other = (await api.getBookings()).find((b) => b.id !== b1.id && b.status !== "CANCELLED" && b.roomId !== b1.roomId)!;
  await rejects(api.updateBooking(b1.id, { roomId: other.roomId, checkIn: other.checkIn, checkOut: other.checkOut }), "CONFLICT");
  ok("moving a booking onto an occupied room/date is rejected (CONFLICT)");
  await rejects(api.updateBookingStatus(b1.id, "CHECKED_OUT"), "VALIDATION");
  ok("invalid status jump CONFIRMED → CHECKED_OUT is rejected");
  const moved = await api.updateBookingStatus(b1.id, "CHECKED_IN");
  assert.equal(moved.status, "CHECKED_IN");
  ok("valid status change works");
  const rooms = await api.getRooms();
  const created = await api.createBooking({ roomId: rooms[0].id, guestName: "Test Guest", email: "t@t.com", phone: "+212 600 000 000", country: "Morocco", guests: 1, checkIn: "2031-01-10", checkOut: "2031-01-12", status: "CONFIRMED", source: "phone", total: 1800 });
  await rejects(api.createBooking({ ...created, roomId: created.roomId, checkIn: "2031-01-11", checkOut: "2031-01-13" }), "CONFLICT");
  const back = await api.createBooking({ ...created, checkIn: "2031-01-12", checkOut: "2031-01-14" });
  assert.ok(back.id !== created.id);
  ok("overlap blocked, back-to-back stays (out the 12th, in the 12th) allowed");

  console.log(`\n${passed} checks passed`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
