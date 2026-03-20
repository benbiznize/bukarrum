import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingNotificationToBusiness, sendBookingPendingToClient } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const {
      resourceId,
      locationId,
      businessId,
      clientName,
      clientEmail,
      clientPhone,
      startTime,
      endTime,
      totalPrice,
    } = await req.json();

    if (!resourceId || !locationId || !businessId || !clientName || !clientEmail || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Server-side double-booking check
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("resource_id", resourceId)
      .in("status", ["pending", "confirmed"])
      .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please select another." },
        { status: 409 }
      );
    }

    // Create booking as "pending"
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        resource_id: resourceId,
        location_id: locationId,
        business_id: businessId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone ?? null,
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        status: "pending",
      })
      .select("id, resource_id, location_id, business_id, client_name, client_email, start_time, end_time, total_price, status")
      .single();

    if (error) {
      if (error.code === "23P01" || error.message.includes("no_overlapping_bookings")) {
        return NextResponse.json(
          { error: "This time slot conflicts with an existing booking." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch business + resource names for emails
    const [{ data: businessData }, { data: resourceData }] = await Promise.all([
      supabase.from("businesses").select("name, owner_id").eq("id", businessId).single(),
      supabase.from("resources").select("name").eq("id", resourceId).single(),
    ]);

    // Generate Fintoc payment link
    let paymentUrl: string | null = null;
    if (process.env.FINTOC_SECRET_KEY) {
      try {
        const fintocRes = await fetch("https://api.fintoc.com/v1/payment_intents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.FINTOC_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(totalPrice),
            currency: "clp",
            customer_email: clientEmail,
            metadata: { booking_id: booking.id },
          }),
        });
        if (fintocRes.ok) {
          const fintocData = await fintocRes.json();
          paymentUrl = fintocData.widget_token ?? null;
          await supabase
            .from("bookings")
            .update({ fintoc_payment_id: fintocData.id })
            .eq("id", booking.id);
        }
      } catch {
        // Payment link generation failed — booking still created
      }
    }

    // Send emails
    if (businessData && resourceData) {
      await Promise.all([
        sendBookingNotificationToBusiness({
          businessName: businessData.name,
          businessOwnerId: businessData.owner_id,
          resourceName: resourceData.name,
          clientName,
          clientEmail,
          startTime,
          endTime,
          totalPrice,
        }),
        sendBookingPendingToClient({
          clientEmail,
          clientName,
          businessName: businessData.name,
          resourceName: resourceData.name,
          startTime,
          endTime,
          totalPrice,
        }),
      ]);
    }

    return NextResponse.json({ booking, widgetToken: paymentUrl }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
