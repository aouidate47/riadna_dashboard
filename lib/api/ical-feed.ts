import { buildIcs } from "@/lib/ical";
import { buildSeed } from "@/lib/mock/seed";

export function buildIcalFeed(riadId: string): string | null {
  const seed = buildSeed();
  const riad = seed.riads.find((item) => item.id === riadId);
  if (!riad) return null;
  return buildIcs({
    riad,
    bookings: seed.bookings.filter((booking) => booking.riadId === riadId),
    blocks: seed.blocks.filter((block) => block.riadId === riadId),
  });
}
