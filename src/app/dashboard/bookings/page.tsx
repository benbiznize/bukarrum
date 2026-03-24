import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BookingsManager from "@/components/dashboard/BookingsManager";
import type { Booking } from "@/utils/supabase/types";

type BookingWithResource = Booking & { resources: { name: string } | null };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { location?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) redirect("/dashboard");

  // Bookings are scoped to the whole business; location filter is optional
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("start_time", { ascending: false });

  if (searchParams.location) {
    query = query.eq("location_id", searchParams.location);
  }

  const { data: bookingRows } = await query;

  const resourceIds = Array.from(new Set((bookingRows ?? []).map((b) => b.resource_id)));
  const { data: resourceRows } = resourceIds.length
    ? await supabase.from("resources").select("id, name").in("id", resourceIds)
    : { data: [] };

  const resourceMap = new Map((resourceRows ?? []).map((r) => [r.id, r]));

  const bookings: BookingWithResource[] = (bookingRows ?? []).map((b) => ({
    ...b,
    resources: resourceMap.get(b.resource_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">
          {searchParams.location ? "Showing bookings for selected location." : "Showing all bookings across all locations."}
        </p>
      </div>
      <BookingsManager initialBookings={bookings} />
    </div>
  );
}
