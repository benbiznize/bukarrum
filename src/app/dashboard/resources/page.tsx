import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ResourcesManager from "@/components/dashboard/ResourcesManager";

export default async function ResourcesPage({
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
    redirect(`/dashboard/resources?location=${first.id}`);
  }

  // Verify ownership
  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .eq("business_id", business.id)
    .single();

  if (!location) redirect("/dashboard");

  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .eq("location_id", location.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resources — {location.name}</h1>
        <p className="text-muted-foreground">Manage the bookable resources at this location.</p>
      </div>
      <ResourcesManager locationId={location.id} initialResources={resources ?? []} />
    </div>
  );
}
