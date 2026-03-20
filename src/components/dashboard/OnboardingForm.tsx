"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

interface Props {
  userId: string;
  businessId?: string;        // provided when adding a location to an existing business
  mode?: "business" | "location"; // "business" = full onboarding; "location" = add location only
}

export default function OnboardingForm({ userId, businessId, mode = "business" }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Location fields
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  function handleBusinessNameChange(val: string) {
    setBusinessName(val);
    setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    if (mode === "location" && businessId) {
      // Adding a new location to existing business
      const { data: newLocation, error } = await supabase
        .from("locations")
        .insert({ business_id: businessId, name: locationName, address: address || null })
        .select("id")
        .single();

      if (error) {
        toast({ title: "Error creating location", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Location added!", description: "Now add resources to this location." });
        router.push(`/dashboard?location=${newLocation.id}`);
        router.refresh();
      }
      setLoading(false);
      return;
    }

    // Full onboarding: create business + first location
    let logo_url: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `logos/${userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("studio-assets")
        .upload(path, logoFile);
      if (!uploadError) {
        const { data } = supabase.storage.from("studio-assets").getPublicUrl(path);
        logo_url = data.publicUrl;
      }
    }

    const { data: newBusiness, error: bizError } = await supabase
      .from("businesses")
      .insert({ owner_id: userId, name: businessName, slug, description: description || null, logo_url })
      .select("id")
      .single();

    if (bizError) {
      toast({ title: "Error creating business", description: bizError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: newLocation, error: locError } = await supabase
      .from("locations")
      .insert({ business_id: newBusiness.id, name: locationName || businessName, address: address || null })
      .select("id")
      .single();

    if (locError) {
      toast({ title: "Error creating location", description: locError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Business created!", description: "Your business is ready. Now add some resources." });
    router.push(`/dashboard?location=${newLocation.id}`);
    router.refresh();
    setLoading(false);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {mode === "business" && (
            <>
              <CardHeader className="px-0 pt-0">
                <CardTitle>Business Details</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                <Label htmlFor="bname">Business name *</Label>
                <Input
                  id="bname"
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  placeholder="e.g. FOTF Studios"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Public URL slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">bukarrum.com/book/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="fotf-studios"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell clients about your business…"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-4">First location</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="lname">Location name *</Label>
            <Input
              id="lname"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={mode === "business" ? "e.g. Main Studio, Branch A…" : "e.g. Branch B"}
              required={mode === "location"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Santiago"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === "location" ? "Adding location…" : "Creating business…"
              : mode === "location" ? "Add location" : "Create business"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
