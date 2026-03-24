import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan_id")
    .eq("owner_id", user.id)
    .single();

  const { data: locations } = business
    ? await supabase
        .from("locations")
        .select("id, name")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={user} business={business} locations={locations ?? []} planId={(business?.plan_id as string) ?? "free"} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
