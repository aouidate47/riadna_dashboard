import type { Booking, BookingStatus, Room } from "@/types"
import { db } from "@/lib/mock/db"

interface ExternalRoomLine {
  id: string
  name: string
  nightlyRate: number
  total: number
}

interface ExternalGuest {
  fullName: string
  email: string
  phone: string
  country: string
  arrivalTime: string
  specialRequests: string
}

interface ExternalBooking {
  code: string
  status: BookingStatus
  createdAt: string
  riadSlug: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  room: ExternalRoomLine
  guest: ExternalGuest
  price: { total: number }
}

const norm = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

function ensureRoom(riadId: string, line: ExternalRoomLine, guests: number): Room {
  const existing = db.rooms.find((room) => room.riadId === riadId && norm(room.name) === norm(line.name))
  if (existing) return existing

  const id = `ext_${riadId}_${line.id}`
  const byId = db.rooms.find((room) => room.id === id)
  if (byId) return byId

  const room: Room = {
    id,
    riadId,
    name: line.name,
    capacity: Math.max(1, guests),
    price: line.nightlyRate,
    photos: [],
    wifi: true,
    bathroom: "private",
    airConditioning: true,
    heating: true,
    breakfast: false,
    terrace: false,
    tv: false,
  }
  db.rooms.push(room)
  return room
}

function merge(ext: ExternalBooking) {
  const riad = db.riads.find((candidate) => candidate.slug === ext.riadSlug)
  if (!riad || !ext.room) return

  const guests = ext.adults + ext.children
  const room = ensureRoom(riad.id, ext.room, guests)
  const id = `ext_${ext.code}`
  const booking: Booking = {
    id,
    code: ext.code,
    riadId: riad.id,
    roomId: room.id,
    guestName: ext.guest.fullName,
    email: ext.guest.email,
    phone: ext.guest.phone,
    country: ext.guest.country,
    guests,
    checkIn: ext.checkIn,
    checkOut: ext.checkOut,
    status: ext.status,
    source: "riadna.ma",
    total: Number(ext.price?.total ?? ext.room.total ?? 0),
    paid: 0,
    notes: ext.guest.specialRequests || undefined,
    createdAt: ext.createdAt || new Date().toISOString(),
  }

  const index = db.bookings.findIndex((candidate) => candidate.id === id)
  if (index >= 0) {
    db.bookings[index] = booking
  } else {
    db.bookings.push(booking)
  }
}

let pending: Promise<void> | null = null

export function syncExternalBookings(): Promise<void> {
  pending ??= run().finally(() => {
    pending = null
  })
  return pending
}

async function run() {
  if (typeof window === "undefined") return

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch("/api/dev/bookings", { cache: "no-store", signal: controller.signal })
    if (!response.ok) return
    const data = (await response.json()) as { bookings?: ExternalBooking[] }
    for (const booking of data.bookings ?? []) {
      try {
        merge(booking)
      } catch {}
    }
  } catch {
  } finally {
    clearTimeout(timer)
  }
}

interface AvailabilityStay {
  riadSlug: string
  roomName: string
  checkIn: string
  checkOut: string
}

let queue: Promise<void> = Promise.resolve()

export function publishAdminAvailability(): Promise<void> {
  const task = queue.then(publishAvailability)
  queue = task.catch(() => {})
  return task
}

async function publishAvailability() {
  if (typeof window === "undefined") return

  const stays: AvailabilityStay[] = []

  for (const booking of db.bookings) {
    if (booking.status === "CANCELLED" || booking.id.startsWith("ext_")) continue
    const riad = db.riads.find((candidate) => candidate.id === booking.riadId)
    const room = db.rooms.find((candidate) => candidate.id === booking.roomId)
    if (riad && room) {
      stays.push({ riadSlug: riad.slug, roomName: room.name, checkIn: booking.checkIn, checkOut: booking.checkOut })
    }
  }

  for (const block of db.blocks) {
    const riad = db.riads.find((candidate) => candidate.id === block.riadId)
    const room = db.rooms.find((candidate) => candidate.id === block.roomId)
    if (riad && room) {
      stays.push({ riadSlug: riad.slug, roomName: room.name, checkIn: block.from, checkOut: block.to })
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)

  try {
    await fetch("/api/dev/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stays }),
      signal: controller.signal,
    })
  } catch {
  } finally {
    clearTimeout(timer)
  }
}
