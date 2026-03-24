"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Resource, ResourceType } from "@/utils/supabase/types";
import { Plus, Pencil, Trash2, DoorOpen } from "lucide-react";
import { isAtLimit, type PlanLimits } from "@/utils/plans";
import { UpgradePrompt } from "@/components/dashboard/UpgradePrompt";

interface Props {
  locationId: string;
  initialResources: Resource[];
  planLimits: PlanLimits;
}

const emptyForm = {
  name: "",
  description: "",
  hourly_rate: "",
  capacity: "",
  type: "room" as ResourceType,
  available_as_addon: false,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  room: "Room",
  equipment: "Equipment",
  service: "Service",
};

export default function ResourcesManager({ locationId, initialResources, planLimits }: Props) {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setPhotoFiles(null);
    setOpen(true);
  }

  function openEdit(resource: Resource) {
    setEditing(resource);
    setForm({
      name: resource.name,
      description: resource.description ?? "",
      hourly_rate: String(resource.hourly_rate),
      capacity: resource.capacity ? String(resource.capacity) : "",
      type: resource.type,
      available_as_addon: resource.available_as_addon,
    });
    setPhotoFiles(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    let photos: string[] = editing?.photos ?? [];

    if (photoFiles && photoFiles.length > 0) {
      const uploads = await Promise.all(
        Array.from(photoFiles).map(async (file) => {
          const ext = file.name.split(".").pop();
          const path = `resources/${locationId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from("studio-assets").upload(path, file);
          if (error) return null;
          return supabase.storage.from("studio-assets").getPublicUrl(path).data.publicUrl;
        })
      );
      photos = uploads.filter(Boolean) as string[];
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      hourly_rate: parseFloat(form.hourly_rate),
      capacity: form.capacity ? parseInt(form.capacity) : null,
      type: form.type,
      available_as_addon: form.available_as_addon,
      photos,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("resources")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Error updating resource", description: error.message, variant: "destructive" });
      } else {
        setResources((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
        toast({ title: "Resource updated" });
        setOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("resources")
        .insert({ ...payload, location_id: locationId })
        .select()
        .single();
      if (error) {
        toast({ title: "Error creating resource", description: error.message, variant: "destructive" });
      } else {
        setResources((prev) => [...prev, data]);
        toast({ title: "Resource created" });
        setOpen(false);
      }
    }
    setLoading(false);
  }

  async function handleDelete(resource: Resource) {
    if (!confirm(`Delete "${resource.name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) {
      toast({ title: "Error deleting resource", description: error.message, variant: "destructive" });
    } else {
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      toast({ title: "Resource deleted" });
    }
  }

  const atResourceLimit = isAtLimit(resources.length, planLimits.max_resources_per_location);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} disabled={atResourceLimit}>
          <Plus className="h-4 w-4 mr-2" /> Add resource
        </Button>
      </div>
      {atResourceLimit && (
        <UpgradePrompt
          currentPlan={planLimits.id}
          limitType="resources"
          limitValue={planLimits.max_resources_per_location}
        />
      )}

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DoorOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No resources yet. Add your first resource to start accepting bookings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id}>
              {resource.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resource.photos[0]} alt={resource.name} className="w-full h-40 object-cover rounded-t-lg" />
              )}
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {resource.name}
                  <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                    {TYPE_LABELS[resource.type]}
                  </span>
                  {resource.available_as_addon && (
                    <span className="text-xs font-normal text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                      Add-on
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resource.description && <p className="text-sm text-muted-foreground">{resource.description}</p>}
                <div className="flex gap-4 text-sm">
                  <span className="font-medium">${Number(resource.hourly_rate).toLocaleString()}/hr</span>
                  {resource.capacity && <span className="text-muted-foreground">Up to {resource.capacity} people</span>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(resource)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(resource)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit resource" : "New resource"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ResourceType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rname">Name *</Label>
              <Input id="rname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdesc">Description</Label>
              <Textarea id="rdesc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rrate">Hourly rate (CLP) *</Label>
                <Input id="rrate" type="number" min="0" step="100" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rcap">Capacity</Label>
                <Input id="rcap" type="number" min="1" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="addon"
                type="checkbox"
                checked={form.available_as_addon}
                onChange={(e) => setForm((f) => ({ ...f, available_as_addon: e.target.checked }))}
                className="h-4 w-4 accent-violet-600"
              />
              <Label htmlFor="addon" className="cursor-pointer">Available as add-on for any booking</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rphotos">Photos</Label>
              <Input id="rphotos" type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(e.target.files)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
