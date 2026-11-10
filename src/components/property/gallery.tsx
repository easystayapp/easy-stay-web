"use client";

/* eslint-disable @next/next/no-img-element -- user-uploaded photos */
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { PropertyImage } from "@/components/ui/property-image";

/** Photo strip: carousel on phones, mosaic on desktop, with a full gallery dialog. */
export function Gallery({ photos, title, seed, overlay }: { photos: string[]; title: string; seed: string; overlay?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const n = photos.length;
  const step = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <>
      {/* Phone carousel */}
      <div className="relative -mx-4 h-[280px] sm:-mx-6 md:hidden">
        <PropertyImage src={photos[i]} alt={`${title} — photo ${i + 1}`} seed={seed} className="size-full" iconSize={46} priority />
        {overlay}
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink">
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => step(1)} className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink">
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
        {n > 0 && (
          <span className="absolute right-4 bottom-4 rounded-full bg-ink/75 px-3 py-1 text-xs font-bold text-white">
            {i + 1} / {n}
          </span>
        )}
      </div>

      {/* Desktop mosaic */}
      <div className="relative hidden h-[420px] grid-cols-[2fr_1fr] gap-3 overflow-hidden rounded-[24px] md:grid">
        <PropertyImage src={photos[0]} alt={`${title} — cover photo`} seed={seed} className="size-full" iconSize={56} priority />
        <div className="grid grid-rows-2 gap-3">
          <PropertyImage src={photos[1]} alt={`${title} — photo 2`} seed={`${seed}2`} className="size-full" />
          <PropertyImage src={photos[2]} alt={`${title} — photo 3`} seed={`${seed}3`} className="size-full" />
        </div>
        {n > 0 && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className="absolute right-4 bottom-4 flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-ink shadow"
          >
            <Images aria-hidden className="size-4" />
            View all {n} photos
          </button>
        )}
      </div>

      <AppDialog open={all} onClose={() => setAll(false)} title={`${title} · ${n} photos`} wide>
        <div className="mt-4 flex flex-col gap-3">
          {photos.map((src, k) => (
            <img key={src} src={src} alt={`${title} — photo ${k + 1}`} className="w-full rounded-2xl object-cover" loading="lazy" />
          ))}
        </div>
      </AppDialog>
    </>
  );
}
