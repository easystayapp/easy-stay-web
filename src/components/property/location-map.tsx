"use client";

import { LocateFixed, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  address: string;
  locality: string;
  city: string;
  geo: { lat: number; lng: number } | null;
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/**
 * Embedded map of the property plus "Get directions" from the visitor's current
 * location. Uses Google Maps' key-free embed and directions links: the pin when we
 * have coordinates, otherwise a search for the address.
 */
export function LocationMap({ title, address, locality, city, geo }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [away, setAway] = useState<number | null>(null);

  const place = geo ? `${geo.lat},${geo.lng}` : [address, locality, city].filter(Boolean).join(", ");
  const q = encodeURIComponent(place);
  const embed = `https://www.google.com/maps?q=${q}&z=15&output=embed`;

  function openDirections(origin?: { lat: number; lng: number }) {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", place);
    if (origin) url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function getDirections() {
    setNote(null);
    if (!("geolocation" in navigator)) return openDirections();
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (geo) setAway(km(here, geo));
        setBusy(false);
        openDirections(here);
      },
      (err) => {
        setBusy(false);
        // Without permission Google Maps still opens and asks for a starting point.
        setNote(err.code === err.PERMISSION_DENIED ? "Location access is off, so choose your starting point in Maps." : "Couldn't get your location, so choose your starting point in Maps.");
        openDirections();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="location-title">
      <h2 id="location-title" className="text-xl font-extrabold">Location</h2>
      <div className="overflow-hidden rounded-[20px] border border-line">
        <iframe
          title={`Map showing ${title}`}
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[260px] w-full border-0 md:h-[340px]"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-muted-2">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
          <span>{[address, locality, city].filter(Boolean).join(", ")}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={getDirections} disabled={busy} className="gap-2">
            {busy ? <LocateFixed aria-hidden className="size-4 animate-pulse" /> : <Navigation aria-hidden className="size-4" />}
            {busy ? "Finding you…" : "Get directions"}
          </Button>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${q}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold"
          >
            Open in Maps
          </a>
        </div>
      </div>
      {away !== null && (
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          About {away < 1 ? `${Math.round(away * 1000)} m` : `${away.toFixed(1)} km`} from your current location (straight line).
        </p>
      )}
      {note && <p className="text-sm text-muted-foreground" aria-live="polite">{note}</p>}
    </section>
  );
}
