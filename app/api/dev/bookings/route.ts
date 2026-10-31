import { promises as fs } from "node:fs"
import path from "node:path"
import { connection } from "next/server"

const file = path.resolve(process.cwd(), "..", "booking-www", ".dev-data", "bookings.json")

async function readBookings() {
  try {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET() {
  await connection()
  return Response.json({ bookings: await readBookings() }, { headers: { "Cache-Control": "no-store" } })
}
