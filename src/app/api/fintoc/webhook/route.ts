import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { sendBookingConfirmationToClient } from "@/lib/email";
import { createHmac, timingSafeEqual } from "crypto";

const REPLAY_TOLERANCE_SECONDS = 300; // 5 minutes

function verifyFintocSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  // Header format: "t=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Reject replays older than the tolerance window
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Math.abs(age) > REPLAY_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const webhookSecret = process.env.FINTOC_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signatureHeader = req.headers.get("Fintoc-Signature") ?? "";
    if (!verifyFintocSignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: { type: string; data: { status: string; metadata?: { booking_id?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const bookingId = event.data.metadata?.booking_id;
  if (!bookingId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .select("id, business_id, resource_id, client_name, client_email, start_time, end_time, total_price, status")
    .single();

  if (bookingError || !booking) {
    console.error("Failed to update booking:", bookingError);
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
  }

  const [{ data: businessData }, { data: resourceData }] = await Promise.all([
    supabase.from("businesses").select("name, owner_id").eq("id", booking.business_id).single(),
    supabase.from("resources").select("name").eq("id", booking.resource_id).single(),
  ]);

  await sendBookingConfirmationToClient({
    clientEmail: booking.client_email,
    clientName: booking.client_name,
    businessName: businessData?.name ?? "Business",
    resourceName: resourceData?.name ?? "Resource",
    startTime: booking.start_time,
    endTime: booking.end_time,
    totalPrice: booking.total_price,
    businessOwnerId: businessData?.owner_id ?? undefined,
  });

  return NextResponse.json({ received: true });
}
