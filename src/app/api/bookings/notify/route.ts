import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { sendCancellationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, status } = await req.json();

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, business_id, resource_id, client_name, client_email, start_time, end_time")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Authorize: verify the caller owns this booking's business
    const { data: businessOwnership } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", booking.business_id)
      .eq("owner_id", user.id)
      .single();

    if (!businessOwnership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (status === "cancelled") {
      const [{ data: businessData }, { data: resourceData }] = await Promise.all([
        supabase.from("businesses").select("name, owner_id").eq("id", booking.business_id).single(),
        supabase.from("resources").select("name").eq("id", booking.resource_id).single(),
      ]);

      await sendCancellationEmail({
        clientEmail: booking.client_email,
        clientName: booking.client_name,
        businessName: businessData?.name ?? "Business",
        resourceName: resourceData?.name ?? "Resource",
        startTime: booking.start_time,
        endTime: booking.end_time,
        businessOwnerId: businessData?.owner_id ?? undefined,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
