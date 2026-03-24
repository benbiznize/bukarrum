import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";

export default async function AvailabilityPage({
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

  const locationId = searchParams.location;
  if (!locationId) {
    const { data: first } = await supabase
      .from("locations")
      .select("id")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!first) redirect("/dashboard");
    redirect(`/dashboard/availability?location=${first.id}`);
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .eq("business_id", business.id)
    .single();

  if (!location) redirect("/dashboard");

  const { data: resources } = await supabase
    .from("resources")
    .select("id, name")
    .eq("location_id", location.id)
    .order("created_at");

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .in("resource_id", (resources ?? []).map((r) => r.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Availability — {location.name}</h1>
        <p className="text-muted-foreground">Set the weekly open hours for each resource.</p>
      </div>
      <AvailabilityManager
        resources={resources ?? []}
        initialAvailability={availability ?? []}
      />
    </div>
  );
}
