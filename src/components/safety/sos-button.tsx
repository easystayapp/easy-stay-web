"use client";

import { MapPin, Phone, Siren } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button, buttonClass } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't available on this device."));
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Allow location access to share where you are.")), {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 30_000,
    });
  });
}

/**
 * SOS during a visit: one tap to dial 112, and a ready-made message with the
 * seeker's current map location and the property they're visiting.
 */
export function SosButton({ place, className, compact }: { place: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      const { coords } = await currentPosition();
      const map = `https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
      const text = `SOS — I need help. I'm visiting ${place}. My location right now: ${map}`;
      if (navigator.share) {
        await navigator.share({ title: "SOS", text }).catch(() => {});
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full bg-brand font-extrabold text-white shadow-[0_2px_10px_rgba(214,40,67,0.35)] transition-colors hover:bg-brand-dark",
          compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm",
          className,
        )}
      >
        <Siren aria-hidden className={compact ? "size-4" : "size-[18px]"} />
        SOS
      </button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="Emergency help" description="Use this if you feel unsafe during a visit.">
        <div className="mt-4 flex flex-col gap-3">
          <a href="tel:112" className={buttonClass("primary", "lg", "w-full")}>
            <Phone aria-hidden className="size-5" />
            Call 112 · Emergency
          </a>
          <Button variant="outline" size="lg" block loading={busy} onClick={share}>
            {!busy && <MapPin aria-hidden className="size-5" />}
            Share my location
          </Button>
          {error && <ErrorNote>{error}</ErrorNote>}
          <a href="tel:181" className="text-center text-sm font-bold text-brand-dark">Women helpline · 181</a>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sharing sends a map link of where you are now. For continuous tracking, use WhatsApp&apos;s “Live location” with someone you trust.
          </p>
        </div>
      </AppDialog>
    </>
  );
}
