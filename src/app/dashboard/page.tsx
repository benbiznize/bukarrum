import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, CalendarCheck, Clock, ArrowRight, Plus } from "lucide-react";
import OnboardingForm from "@/components/dashboard/OnboardingForm";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { location?: string; new?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  // No business yet → onboarding
  if (!business) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Welcome to Bukarrum!</h1>
        <p className="text-muted-foreground mb-6">Let&apos;s set up your business so clients can find and book you.</p>
        <OnboardingForm userId={user.id} />
      </div>
    );
  }

  // Add new location
  if (searchParams.new === "1") {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Add a new location</h1>
        <p className="text-muted-foreground mb-6">Each location gets its own rooms and availability under <strong>{business.name}</strong>.</p>
        <OnboardingForm userId={user.id} businessId={business.id} mode="location" />
      </div>
    );
  }

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  // Redirect to first location if none selected
  const locationId = searchParams.location;
  const location = locations?.find((l) => l.id === locationId) ?? locations?.[0];

  if (!location) {
    // Business exists but no locations yet — should not happen after onboarding, but handle gracefully
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Add your first location</h1>
        <p className="text-muted-foreground mb-6">Add a physical location for <strong>{business.name}</strong>.</p>
        <OnboardingForm userId={user.id} businessId={business.id} mode="location" />
      </div>
    );
  }

  if (!locationId || location.id !== locationId) {
    redirect(`/dashboard?location=${location.id}`);
  }

  // Stats for selected location
  const [{ count: resourceCount }, { data: recentBookings }, { count: confirmedCount }] =
    await Promise.all([
      supabase.from("resources").select("*", { count: "exact", head: true }).eq("location_id", location.id),
      supabase
        .from("bookings")
        .select("*")
        .eq("location_id", location.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("location_id", location.id)
        .eq("status", "confirmed"),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">bukarrum.com/book/{business.slug} · {location.name}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard?new=1">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add location
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resourceCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentBookings?.filter((b) => b.status === "pending").length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/bookings?location=${location.id}`}>
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentBookings?.length ? (
            <p className="text-sm text-muted-foreground">No bookings yet. Share your public booking page to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{b.client_name}</p>
                    <p className="text-xs text-muted-foreground">{b.client_email}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "destructive" : "warning"}
                    >
                      {b.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(b.start_time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
