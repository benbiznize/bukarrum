import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BookingPageClient from "@/components/booking/BookingPageClient";
import type { Business, Location, Resource, Availability } from "@/utils/supabase/types";

type ResourceWithAvailability = Resource & { availability: Availability[] };
type LocationWithResources = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  resources: ResourceWithAvailability[];
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage(props: Props) {
  const { slug } = await props.params;
  const supabase = await createClient();

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .single();
  const business = businessRow as Business | null;

  if (!business) notFound();

  const { data: locationRowsRaw } = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at");
  const locationRows = locationRowsRaw as Location[] | null;

  const { data: resourceRowsRaw } = await supabase
    .from("resources")
    .select("*")
    .in("location_id", (locationRows ?? []).map((l) => l.id))
    .order("created_at");
  const resourceRows = resourceRowsRaw as Resource[] | null;

  const { data: availabilityRowsRaw } = await supabase
    .from("availability")
    .select("*")
    .in("resource_id", (resourceRows ?? []).map((r) => r.id));
  const availabilityRows = availabilityRowsRaw as Availability[] | null;

  const locations: LocationWithResources[] = (locationRows ?? []).map((loc) => {
    const locResources = (resourceRows ?? [])
      .filter((r) => r.location_id === loc.id)
      .map((resource) => ({
        ...resource,
        availability: (availabilityRows ?? []).filter((a) => a.resource_id === resource.id),
      }));
    return { ...loc, resources: locResources };
  });

  return <BookingPageClient business={business} locations={locations} />;
}

export async function generateMetadata(props: Props) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, description")
    .eq("slug", slug)
    .single();

  return {
    title: business ? `Book ${business.name} — Bukarrum` : "Not found",
    description: business?.description ?? undefined,
  };
}
