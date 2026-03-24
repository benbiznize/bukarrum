"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, DoorOpen, CalendarDays, BookOpen, LogOut, ExternalLink, ChevronDown, Plus, MapPin, Zap } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  user: { email?: string } | null;
  business: Business | null;
  locations: Location[];
  planId?: string;
}

export default function DashboardNav({ user, business, locations, planId = "free" }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationId = searchParams.get("location") ?? locations[0]?.id ?? null;

  const navItems = [
    { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "/dashboard/resources", label: "Resources", icon: DoorOpen },
    { path: "/dashboard/availability", label: "Availability", icon: CalendarDays },
    { path: "/dashboard/bookings", label: "Bookings", icon: BookOpen },
  ];

  function navHref(path: string) {
    return locationId ? `${path}?location=${locationId}` : path;
  }

  function switchLocation(id: string) {
    router.push(`${pathname}?location=${id}`);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const currentLocation = locations.find((l) => l.id === locationId) ?? locations[0] ?? null;

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-violet-700">Bukarrum</Link>

          {/* Location switcher */}
          {locations.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md px-3 py-1.5 transition-colors">
                <MapPin className="h-3.5 w-3.5 text-violet-600" />
                <span className="max-w-[160px] truncate">{currentLocation?.name ?? "Select location"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <div className="absolute left-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => switchLocation(loc.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-lg transition-colors flex items-center gap-2",
                      loc.id === locationId ? "text-violet-700 font-medium bg-violet-50" : "text-gray-700"
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{loc.name}</span>
                  </button>
                ))}
                <div className="border-t">
                  <Link
                    href="/dashboard?new=1"
                    className="w-full text-left px-4 py-2.5 text-sm text-violet-600 hover:bg-violet-50 last:rounded-b-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add location
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={navHref(path)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === path
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {planId === "free" && (
            <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700 text-white">
              <Link href="/dashboard/upgrade">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Upgrade
              </Link>
            </Button>
          )}
          {business && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/book/${business.slug}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Public page
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
