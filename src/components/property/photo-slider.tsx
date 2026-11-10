"use client";

/* eslint-disable @next/next/no-img-element -- photos come from user uploads on any storage host */
import { useEffect, useRef, useState } from "react";
import { PropertyImage } from "@/components/ui/property-image";
import { cn } from "@/lib/utils";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** First slide comes quickly after hover/focus starts, then a steady pace. */
const FIRST_MS = 900;
const SLIDE_MS = 2200;

/**
 * A listing's photos as a carousel that slides on its own while the card is
 * on screen, and can still be swiped (scroll-snap). Pauses on hover and
 * stays still for reduced-motion users. Dots show the
 * position.
 */
export function PhotoSlider({
  photos,
  alt,
  seed,
  className,
  iconSize,
  playing = false,
}: {
  playing?: boolean;
  photos: string[];
  alt: string;
  seed: string;
  className?: string;
  iconSize?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const started = useRef(false);
  const reducedMotion = useReducedMotion();
  const total = photos.length;
  const active = playing && !reducedMotion && total > 1;

  // Next photo after a pause, wrapping to the first. A swipe changes `index`,
  // which restarts the wait.
  useEffect(() => {
    if (!active) {
      started.current = false;
      return;
    }
    const t = setTimeout(() => {
      started.current = true;
      const el = track.current;
      if (el) el.scrollTo({ left: ((index + 1) % total) * el.clientWidth });
    }, started.current ? SLIDE_MS : FIRST_MS);
    return () => clearTimeout(t);
  }, [active, index, total]);

  if (total <= 1) return <PropertyImage src={photos[0] ?? null} alt={alt} seed={seed} className={className} iconSize={iconSize} />;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={track}
        aria-label={`${alt}: ${total} photos`}
        role="group"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, k) => (
          <img
            key={k}
            src={src}
            alt={k === 0 ? alt : `${alt}, photo ${k + 1}`}
            draggable={false}
            loading={k === 0 || playing ? "eager" : "lazy"}
            decoding="async"
            className="size-full shrink-0 snap-start snap-always object-cover"
          />
        ))}
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-ink/35 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        {photos.map((_, k) => (
          <span
            key={k}
            className={cn(
              "h-1.5 rounded-full shadow-[0_0_2px_rgba(30,27,31,0.3)] transition-[width,background-color] duration-300",
              k === index ? "w-3.5 bg-white" : "w-1.5 bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
