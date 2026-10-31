import { promises as fs } from "node:fs"
import path from "node:path"
import { connection } from "next/server"

interface Stay {
  riadSlug: string
  roomName: string
  checkIn: string
  checkOut: string
}

const file = path.resolve(process.cwd(), "..", "booking-www", ".dev-data", "availability.json")

async function readStays(): Promise<Stay[]> {
  try {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.stays) ? (parsed.stays as Stay[]) : []
  } catch {
    return []
  }
}

export async function GET() {
  await connection()
  return Response.json({ stays: await readStays() }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  let stays: Stay[]
  try {
    const body = (await request.json()) as { stays?: Stay[] }
    stays = Array.isArray(body.stays) ? body.stays : []
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify({ stays }, null, 2), "utf8")
  } catch {
    return Response.json({ error: "Could not persist availability" }, { status: 500 })
  }

  return Response.json({ ok: true, count: stays.length }, { status: 201 })
}
