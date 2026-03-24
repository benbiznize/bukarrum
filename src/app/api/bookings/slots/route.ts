import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get("resourceId");
  const date = searchParams.get("date"); // yyyy-MM-dd

  if (!resourceId || !date) {
    return NextResponse.json({ error: "Missing resourceId or date" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("resource_id", resourceId)
    .in("status", ["pending", "confirmed"])
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd);

  // Convert booked intervals to blocked hour slots (HH:MM)
  const bookedSlots: string[] = [];
  for (const booking of bookings ?? []) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    let cur = new Date(start);
    while (cur < end) {
      const h = String(cur.getUTCHours()).padStart(2, "0");
      const m = String(cur.getUTCMinutes()).padStart(2, "0");
      bookedSlots.push(`${h}:${m}`);
      cur = new Date(cur.getTime() + 60 * 60 * 1000);
    }
  }

  return NextResponse.json({ bookedSlots });
}
