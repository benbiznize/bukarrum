"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Availability } from "@/lib/supabase/types";
import { Trash2, Plus } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Resource { id: string; name: string }

interface Props {
  resources: Resource[];
  initialAvailability: Availability[];
}

export default function AvailabilityManager({ resources, initialAvailability }: Props) {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<Availability[]>(initialAvailability);
  const [selectedResource, setSelectedResource] = useState(resources[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [loading, setLoading] = useState(false);

  const resourceAvailability = availability.filter((a) => a.resource_id === selectedResource);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedResource) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("availability")
      .upsert(
        {
          resource_id: selectedResource,
          day_of_week: parseInt(dayOfWeek),
          open_time: openTime,
          close_time: closeTime,
        },
        { onConflict: "resource_id,day_of_week" }
      )
      .select()
      .single();

    if (error) {
      toast({ title: "Error saving availability", description: error.message, variant: "destructive" });
    } else {
      setAvailability((prev) => {
        const filtered = prev.filter(
          (a) => !(a.resource_id === selectedResource && a.day_of_week === parseInt(dayOfWeek))
        );
        return [...filtered, data];
      });
      toast({ title: "Availability saved" });
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("availability").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      setAvailability((prev) => prev.filter((a) => a.id !== id));
    }
  }

  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Add resources first before setting availability.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource selector */}
      <div className="space-y-2">
        <Label>Select resource</Label>
        <Select value={selectedResource} onValueChange={setSelectedResource}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add / update hours</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Open</Label>
              <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-32" required />
            </div>
            <div className="space-y-2">
              <Label>Close</Label>
              <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-32" required />
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4 mr-1" /> {loading ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {resourceAvailability.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hours set for this resource yet.</p>
          ) : (
            <div className="space-y-2">
              {resourceAvailability
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((av) => (
                  <div key={av.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium text-sm">{DAYS[av.day_of_week]}</span>
                    <span className="text-sm text-muted-foreground">
                      {av.open_time.slice(0, 5)} – {av.close_time.slice(0, 5)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(av.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
