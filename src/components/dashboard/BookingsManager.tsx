"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@/lib/supabase/types";
import { format } from "date-fns";
import { CheckCircle, XCircle, CalendarX } from "lucide-react";

type BookingWithResource = Booking & { resources: { name: string } | null };

interface Props {
  initialBookings: BookingWithResource[];
}

const statusVariant = {
  pending: "warning" as const,
  confirmed: "success" as const,
  cancelled: "destructive" as const,
};

export default function BookingsManager({ initialBookings }: Props) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithResource[]>(initialBookings);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  async function updateStatus(bookingId: string, status: "confirmed" | "cancelled") {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error updating booking", description: error.message, variant: "destructive" });
    } else {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      toast({ title: `Booking ${status}` });

      // Trigger email notification
      await fetch("/api/bookings/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarX className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No bookings found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{booking.client_name}</span>
                      <Badge variant={statusVariant[booking.status]}>{booking.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{booking.client_email}</p>
                    {booking.client_phone && (
                      <p className="text-sm text-muted-foreground">{booking.client_phone}</p>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">{booking.resources?.name ?? "Resource"}</span>
                      {" · "}
                      {format(new Date(booking.start_time), "PPP")}
                      {" · "}
                      {format(new Date(booking.start_time), "HH:mm")} – {format(new Date(booking.end_time), "HH:mm")}
                    </div>
                    <p className="text-sm font-medium">${Number(booking.total_price).toLocaleString()} CLP</p>
                  </div>
                  {booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateStatus(booking.id, "confirmed")}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(booking.id, "cancelled")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
