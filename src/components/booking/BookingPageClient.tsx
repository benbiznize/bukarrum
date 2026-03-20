"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Business, Resource, Availability } from "@/lib/supabase/types";
import { Users, Clock, ChevronRight, MapPin } from "lucide-react";
import BookingForm from "./BookingForm";

type ResourceWithAvailability = Resource & { availability: Availability[] };
type LocationWithResources = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  resources: ResourceWithAvailability[];
};

interface Props {
  business: Business;
  locations: LocationWithResources[];
}

const TYPE_LABELS: Record<string, string> = {
  room: "Room",
  equipment: "Equipment",
  service: "Service",
};

export default function BookingPageClient({ business, locations }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<LocationWithResources | null>(
    locations.length === 1 ? locations[0] : null
  );
  const [selectedResource, setSelectedResource] = useState<ResourceWithAvailability | null>(null);

  function goBackToLocations() {
    setSelectedLocation(null);
    setSelectedResource(null);
  }

  function goBackToResources() {
    setSelectedResource(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Business Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            {business.logo_url && (
              <Image
                src={business.logo_url}
                alt={business.name}
                width={64}
                height={64}
                className="rounded-xl object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              {business.description && (
                <p className="text-muted-foreground mt-1 max-w-2xl">{business.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Step 3: Booking form */}
        {selectedResource && selectedLocation && (
          <div>
            <Button variant="ghost" className="mb-6 -ml-2" onClick={goBackToResources}>
              ← Back to resources
            </Button>
            <BookingForm
              business={business}
              location={selectedLocation}
              resource={selectedResource}
            />
          </div>
        )}

        {/* Step 2: Resource selector */}
        {!selectedResource && selectedLocation && (
          <div>
            {locations.length > 1 && (
              <Button variant="ghost" className="mb-6 -ml-2" onClick={goBackToLocations}>
                ← Back to locations
              </Button>
            )}
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-violet-600" />
              <h2 className="text-xl font-semibold">{selectedLocation.name}</h2>
              {selectedLocation.address && (
                <span className="text-sm text-muted-foreground">· {selectedLocation.address}</span>
              )}
            </div>
            {selectedLocation.resources.length === 0 ? (
              <p className="text-muted-foreground">No resources available at this location.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {selectedLocation.resources.map((resource) => (
                  <Card
                    key={resource.id}
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedResource(resource)}
                  >
                    {resource.photos[0] && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={resource.photos[0]}
                          alt={resource.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {resource.name}
                          <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                            {TYPE_LABELS[resource.type]}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </CardTitle>
                      {resource.description && (
                        <CardDescription>{resource.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        ${Number(resource.hourly_rate).toLocaleString()} CLP/hr
                      </Badge>
                      {resource.capacity && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Up to {resource.capacity}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Location selector (only shown when multiple locations) */}
        {!selectedResource && !selectedLocation && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Choose a location</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((loc) => (
                <Card
                  key={loc.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedLocation(loc)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-violet-600" />
                        {loc.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    {loc.address && <CardDescription>{loc.address}</CardDescription>}
                    {loc.description && <CardDescription>{loc.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {loc.resources.length} resource{loc.resources.length !== 1 ? "s" : ""} available
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t mt-12">
        Powered by <span className="font-semibold text-violet-700">Bukarrum</span>
      </footer>
    </div>
  );
}
