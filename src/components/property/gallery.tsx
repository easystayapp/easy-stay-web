"use client";

/* eslint-disable @next/next/no-img-element -- user-uploaded photos */
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { PropertyImage } from "@/components/ui/property-image";
import { cx } from "@/lib/client/cx";

/** One clickable photo in the desktop mosaic. */
function MosaicCell({
  photos, k, n, title, seed, onOpen, className, iconSize, children,
}: {
  photos: string[]; k: number; n: number; title: string; seed: string; onOpen: (k: number) => void;
  className?: string; iconSize?: number; children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(k)}
      aria-label={k === 0 ? "Open photo gallery" : `Open photo ${k + 1} of ${n}`}
      className={cx("group relative block min-h-0 overflow-hidden outline-offset-[-3px] focus-visible:outline-3 focus-visible:outline-brand", className)}
    >
      <PropertyImage
        src={photos[k]}
        alt={k === 0 ? `${title} — cover photo` : `${title} — photo ${k + 1}`}
        seed={k === 0 ? seed : `${seed}${k + 1}`}
        className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        iconSize={iconSize}
        priority={k === 0}
      />
      {children}
    </button>
  );
}

/** Photo strip: carousel on phones, mosaic on desktop, with a full gallery dialog. */
export function Gallery({ photos, title, seed, overlay }: { photos: string[]; title: string; seed: string; overlay?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const [from, setFrom] = useState(0);
  const n = photos.length;
  const openAt = (k: number) => {
    setFrom(k);
    setAll(true);
  };
  // Jump the full-photo viewer to the thumbnail that was tapped, once it has mounted.
  useEffect(() => {
    if (!all) return;
    const t = window.setTimeout(() => document.getElementById(`gallery-photo-${from}`)?.scrollIntoView({ block: "start" }), 60);
    return () => window.clearTimeout(t);
  }, [all, from]);
  // Tiles beside the cover: up to four, fewer when the listing has fewer photos.
  const tiles = Math.max(0, Math.min(n - 1, 4));
  const cell = { photos, n, title, seed, onOpen: openAt };
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

      {/* Desktop mosaic: big cover + up to four tiles; the last tile says "View all N photos" */}
      <div
        className={cx(
          "relative hidden h-[440px] gap-3 overflow-hidden rounded-[24px] md:grid",
          tiles >= 3 ? "grid-cols-[2fr_1fr_1fr] grid-rows-2" : tiles >= 1 ? "grid-cols-[2fr_1fr] grid-rows-2" : "grid-cols-1",
        )}
      >
        <MosaicCell {...cell} k={0} className={tiles >= 1 ? "row-span-2" : ""} iconSize={56} />
        {Array.from({ length: tiles }, (_, t) => {
          const k = t + 1;
          const last = t === tiles - 1;
          // Only two tiles: stack them. Three: the last one fills the bottom row.
          const span = tiles === 1 ? "row-span-2" : tiles === 3 && last ? "col-span-2" : "";
          const hidden = n - (tiles + 1);
          return (
            <MosaicCell key={k} {...cell} k={k} className={span}>
              {last && hidden > 0 && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink/55 text-white transition-colors group-hover:bg-ink/65">
                  <Images aria-hidden className="size-6" />
                  <span className="text-[17px] font-extrabold">View all</span>
                  <span className="text-sm font-semibold text-white/85">{n} photos</span>
                </span>
              )}
            </MosaicCell>
          );
        })}
        {n > tiles + 1 ? null : n > 1 && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute right-4 bottom-4 flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-bold text-ink shadow"
          >
            <Images aria-hidden className="size-4" />
            View all {n} photos
          </button>
        )}
      </div>

      {/* Desktop thumbnail strip: every photo, scrolls sideways */}
      {n > 3 && (
        <ul className="mt-3 hidden gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:flex" aria-label="All photos">
          {photos.map((src, k) => (
            <li key={src} className="w-[calc((100%-6rem)/9)] min-w-[96px] shrink-0">
              <button
                type="button"
                onClick={() => openAt(k)}
                aria-label={`Open photo ${k + 1} of ${n}`}
                className="block aspect-[3/2] w-full overflow-hidden rounded-xl outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <img src={src} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AppDialog open={all} onClose={() => setAll(false)} title={`${title} · ${n} photos`} wide>
        <div className="mt-4 flex flex-col gap-3">
          {photos.map((src, k) => (
            <img key={src} id={`gallery-photo-${k}`} src={src} alt={`${title} — photo ${k + 1}`} className="w-full rounded-2xl object-cover" loading="lazy" />
          ))}
        </div>
      </AppDialog>
    </>
  );
}
