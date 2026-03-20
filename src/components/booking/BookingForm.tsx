"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Business, Resource, Availability } from "@/lib/supabase/types";
import { format, addDays } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";

type ResourceWithAvailability = Resource & { availability: Availability[] };
type LocationLike = { id: string; name: string };

interface Props {
  business: Business;
  location: LocationLike;
  resource: ResourceWithAvailability;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function generateTimeSlots(openTime: string, closeTime: string): string[] {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  let h = openH, m = openM;
  while (h < closeH || (h === closeH && m < closeM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 60;
    if (m >= 60) { h += 1; m -= 60; }
  }
  return slots;
}

export default function BookingForm({ business, location, resource }: Props) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [fintocReady, setFintocReady] = useState(false);
  const fintocWidgetRef = useRef<{ open: () => void } | null>(null);

  // Poll for Fintoc JS being ready
  useEffect(() => {
    if (!submitted || fintocReady) return;
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Fintoc) {
        setFintocReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [submitted, fintocReady]);

  // Next 30 days with availability
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(new Date(), i);
    const dow = d.getDay();
    const hasAvailability = resource.availability.some((a) => a.day_of_week === dow);
    return hasAvailability ? format(d, "yyyy-MM-dd") : null;
  }).filter(Boolean) as string[];

  useEffect(() => {
    if (!selectedDate) return;
    const dow = new Date(selectedDate + "T00:00:00").getDay();
    const avail = resource.availability.find((a) => a.day_of_week === dow);
    if (!avail) { setAvailableSlots([]); return; }
    setAvailableSlots(generateTimeSlots(avail.open_time, avail.close_time));

    fetch(`/api/bookings/slots?resourceId=${resource.id}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setBookedSlots(data.bookedSlots ?? []))
      .catch(() => setBookedSlots([]));

    setSelectedStart("");
    setSelectedEnd("");
  }, [selectedDate, resource]);

  const endSlots = selectedStart
    ? availableSlots.filter((s) => s > selectedStart)
    : [];

  const hours =
    selectedStart && selectedEnd
      ? (new Date(`2000-01-01T${selectedEnd}:00`).getTime() -
          new Date(`2000-01-01T${selectedStart}:00`).getTime()) / 3600000
      : 0;

  const totalPrice = Math.round(hours * Number(resource.hourly_rate));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedStart || !selectedEnd) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    setLoading(true);

    const startTime = new Date(`${selectedDate}T${selectedStart}:00`).toISOString();
    const endTime = new Date(`${selectedDate}T${selectedEnd}:00`).toISOString();

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceId: resource.id,
        locationId: location.id,
        businessId: business.id,
        clientName,
        clientEmail,
        clientPhone,
        startTime,
        endTime,
        totalPrice,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast({ title: "Booking failed", description: data.error, variant: "destructive" });
    } else {
      setWidgetToken(data.widgetToken ?? null);
      setSubmitted(true);
    }
    setLoading(false);
  }

  function openFintocWidget() {
    if (typeof window === "undefined" || !widgetToken) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Fintoc = (window as any).Fintoc;
    if (!Fintoc) {
      toast({ title: "Payment not ready yet", description: "Please wait a moment and try again.", variant: "destructive" });
      return;
    }
    if (fintocWidgetRef.current) {
      fintocWidgetRef.current.open();
      return;
    }
    const widget = Fintoc.create({
      publicKey: process.env.NEXT_PUBLIC_FINTOC_PUBLIC_KEY,
      product: "payments",
      widgetToken: widgetToken,
      holderType: "individual",
      onSuccess: () => { setPaid(true); },
      onExit: () => {},
    });
    fintocWidgetRef.current = widget;
    widget.open();
  }

  if (paid) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-700">Payment confirmed!</CardTitle>
          <CardDescription>
            Your booking for <strong>{resource.name}</strong> at <strong>{location.name}</strong> on {selectedDate} from {selectedStart} to {selectedEnd} is confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You&apos;ll receive a confirmation email at <strong>{clientEmail}</strong> shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <>
        <Script src="https://js.fintoc.com/v1/" strategy="afterInteractive" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-green-700">Booking received!</CardTitle>
            <CardDescription>
              Your booking for <strong>{resource.name}</strong> on {selectedDate} from {selectedStart} to {selectedEnd} is pending payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {widgetToken ? (
              <div>
                <p className="text-sm mb-3">Complete your payment to confirm the booking:</p>
                <Button
                  className="w-full"
                  onClick={openFintocWidget}
                  disabled={!fintocReady}
                >
                  {fintocReady ? `Pay now — $${totalPrice.toLocaleString()} CLP` : "Loading payment…"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The studio will confirm your booking shortly. You&apos;ll receive an email confirmation.
              </p>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Resource summary */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>{resource.name}</CardTitle>
            {resource.description && <CardDescription>{resource.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>${Number(resource.hourly_rate).toLocaleString()} CLP per hour</span>
            </div>
            {resource.availability.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Open hours</p>
                <div className="space-y-1">
                  {resource.availability
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map((av) => (
                      <div key={av.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{DAYS[av.day_of_week]}</span>
                        <span>{av.open_time.slice(0, 5)} – {av.close_time.slice(0, 5)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {selectedStart && selectedEnd && (
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Duration</span>
                  <span>{hours} hour{hours !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${totalPrice.toLocaleString()} CLP</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Select date & time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a date…" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {format(new Date(d + "T00:00:00"), "EEEE, MMMM d")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDate && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Select value={selectedStart} onValueChange={setSelectedStart}>
                    <SelectTrigger>
                      <SelectValue placeholder="From…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map((s) => (
                        <SelectItem key={s} value={s} disabled={bookedSlots.includes(s)}>
                          {s} {bookedSlots.includes(s) ? "(booked)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Select value={selectedEnd} onValueChange={setSelectedEnd} disabled={!selectedStart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Until…" />
                    </SelectTrigger>
                    <SelectContent>
                      {endSlots.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Full name *</Label>
              <Input id="cname" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cemail">Email *</Label>
              <Input id="cemail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cphone">Phone</Label>
              <Input id="cphone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+56 9 XXXX XXXX" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={loading || !selectedStart || !selectedEnd}>
          {loading ? "Processing…" : `Request booking — $${totalPrice.toLocaleString()} CLP`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Your booking will be confirmed after payment is completed.
        </p>
      </form>
    </div>
  );
}
