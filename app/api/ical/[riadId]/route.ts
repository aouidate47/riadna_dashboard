import { buildIcalFeed } from "@/lib/api/ical-feed";

export async function GET(request: Request, { params }: { params: Promise<{ riadId: string }> }) {
  const { riadId } = await params;
  const feed = buildIcalFeed(riadId);

  if (!feed) {
    return Response.json({ error: "Unknown riad" }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("download");
  return new Response(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      ...(download ? { "Content-Disposition": `attachment; filename="riadna-${riadId}.ics"` } : {}),
    },
  });
}
