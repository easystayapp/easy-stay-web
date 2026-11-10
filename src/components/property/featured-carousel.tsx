"use client";

/* eslint-disable @next/next/no-img-element -- user-uploaded photos */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StarIcon } from "@/components/ui/primitives";
import { PropertyImage } from "@/components/ui/property-image";
import { cn } from "@/lib/utils";
import { GENDER_LABEL, PROPERTY_TYPE_SHORT, SHARING_LABEL } from "@/lib/domain/catalog";
import { formatRupees } from "@/lib/domain/format";
import type { FeaturedStay } from "@/types/api";

/** How long each photo stays up; a stay is shown for all of its photos. */
const PHOTO_MS = 2600;
const MIN_STAY_MS = 4500;
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function usePrefersReducedMotion() {
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

const stayDuration = (s: FeaturedStay) => (s.photos.length > 1 ? s.photos.length * PHOTO_MS : MIN_STAY_MS);

/**
 * Home hero: the city's top-rated stays (mixed types). Each stay plays
 * through all of its photos (crossfade + gentle zoom) before the next stay;
 * the property card carries a matching photo carousel with dots to jump between photos.
 */
export function FeaturedCarousel({ items, city }: { items: FeaturedStay[]; city: string }) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0, 1]));
  const reducedMotion = usePrefersReducedMotion();
  const pointerStart = useRef<number | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (i: number) => {
      const next = ((i % n) + n) % n;
      setIndex(next);
      setPhoto(0);
      // Load photos for the shown stay and the one after it.
      setLoaded((s) => (s.has(next) && s.has((next + 1) % n) ? s : new Set([...s, next, (next + 1) % n])));
    },
    [n],
  );
  const paused = hovered || focused || hidden || reducedMotion || n === 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start from the first slide for new data
    setIndex(0);
    setPhoto(0);
    setLoaded(new Set([0, 1]));
  }, [items]);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Autoplay: next photo of this stay, then the next stay.
  useEffect(() => {
    if (paused || !n) return;
    const count = items[index].photos.length;
    const t = setTimeout(
      () => {
        if (photo < count - 1) setPhoto(photo + 1);
        else if (n > 1) go(index + 1);
        else setPhoto(0);
      },
      count > 1 ? PHOTO_MS : MIN_STAY_MS,
    );
    return () => clearTimeout(t);
  }, [index, photo, paused, go, items, n]);

  if (!n) return null;
  const fade = reducedMotion ? "" : `transition-[opacity,transform] duration-[900ms] ${EASE}`;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`Top rated stays in ${city}`}
      className="relative h-[420px] overflow-hidden rounded-[32px] bg-blush-2 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onPointerDown={(e) => {
        pointerStart.current = e.clientX;
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        if (pointerStart.current == null) return;
        const dx = e.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(dx) > 40) {
          swiped.current = true;
          go(index + (dx < 0 ? 1 : -1));
        }
      }}
      onClickCapture={(e) => {
        // A swipe that starts on a slide shouldn't also open it.
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
          swiped.current = false;
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {/* Photo layers for loaded stays: crossfade with a slow settle-in zoom */}
      {items.map((p, i) =>
        p.photos.length ? (
          loaded.has(i) &&
          p.photos.map((src, k) => (
            <img
              key={`${p.id}-${k}`}
              src={src}
              alt=""
              aria-hidden
              loading="eager"
              decoding="async"
              className={cn(
                "absolute inset-0 size-full object-cover",
                fade,
                i === index && k === photo ? "scale-100 opacity-100" : "scale-[1.05] opacity-0",
              )}
            />
          ))
        ) : (
          <div key={p.id} aria-hidden className={cn("absolute inset-0", fade, i === index ? "opacity-100" : "opacity-0")}>
            <PropertyImage src={null} alt="" seed={p.id} className="size-full" iconSize={72} />
          </div>
        ),
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-ink/25 via-transparent to-ink/45" />

      {/* Property card on a sliding track, with its own photo carousel inside */}
      <div className="absolute inset-x-6 bottom-12 overflow-hidden rounded-[18px] shadow-[0_10px_28px_rgba(30,27,31,0.18)]">
        <div
          className={cn("flex", !reducedMotion && `transition-transform duration-700 ${EASE}`)}
          style={{ transform: `translateX(-${index * 100}%)` }}
          aria-live={paused ? "polite" : "off"}
        >
          {items.map((p, i) => {
            const active = i === index;
            return (
              <div
                key={p.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}: ${p.title}`}
                inert={!active}
                className="relative w-full shrink-0 bg-white p-3"
              >
                <div className="flex items-center gap-3.5">
                  <PhotoCarousel
                    id={p.id}
                    title={p.title}
                    photos={p.photos}
                    current={active ? photo : 0}
                    show={loaded.has(i)}
                    reducedMotion={reducedMotion}
                    onPick={setPhoto}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[11px] font-bold tracking-wide text-brand-dark uppercase">
                      {PROPERTY_TYPE_SHORT[p.type]} · {SHARING_LABEL[p.sharing]} · {GENDER_LABEL[p.availableFor]}
                    </span>
                    {/* Stretched link: the whole card opens the stay; photo dots sit above it */}
                    <Link
                      href={`/properties/${p.id}`}
                      draggable={false}
                      className="truncate text-sm font-bold text-ink outline-none after:absolute after:inset-0 after:rounded-[18px] after:content-[''] hover:text-ink focus-visible:after:ring-2 focus-visible:after:ring-brand focus-visible:after:ring-inset"
                    >
                      {p.title}
                    </Link>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {p.rating.count >= 3 && p.rating.average != null ? (
                        <>
                          <StarIcon className="size-3" />
                          <b className="font-bold text-ink">{p.rating.average.toFixed(1)}</b>
                          <span>({p.rating.count})</span>
                        </>
                      ) : (
                        <span className="font-bold text-ok">New</span>
                      )}
                      <span aria-hidden>·</span>
                      <span className="truncate">{p.locality}</span>
                    </span>
                    <span className="text-sm font-extrabold text-brand">{formatRupees(p.rent)}/mo</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stay dots; the active one fills over the stay's whole photo run */}
      {n > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex justify-center gap-1.5">
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Show stay ${i + 1} of ${n}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full bg-white/70 transition-[width] duration-500",
                i === index ? "w-7" : "w-1.5 hover:bg-white",
              )}
            >
              {i === index && (
                <span
                  key={`${index}-${paused}`}
                  className={cn("absolute inset-y-0 left-0 rounded-full bg-brand", paused ? "w-full" : "animate-[es-progress_linear_forwards]")}
                  style={paused ? undefined : { animationDuration: `${stayDuration(p)}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The card's photo slot: the stay's photos on a sliding track, kept in step
 * with the big background photo. Dots show the position and jump to a photo.
 */
function PhotoCarousel({
  id,
  title,
  photos,
  current,
  show,
  reducedMotion,
  onPick,
}: {
  id: string;
  title: string;
  photos: string[];
  current: number;
  show: boolean;
  reducedMotion: boolean;
  onPick: (k: number) => void;
}) {
  const total = photos.length;
  if (total <= 1) {
    return <PropertyImage src={photos[0] ?? null} alt="" seed={id} className="h-[88px] w-28 shrink-0 rounded-xl" iconSize={26} priority />;
  }
  return (
    <div className="relative h-[88px] w-28 shrink-0 overflow-hidden rounded-xl bg-blush-2">
      <div
        className={cn("flex h-full", !reducedMotion && `transition-transform duration-700 ${EASE}`)}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {photos.map((src, k) => (
          <div key={k} className="h-full w-full shrink-0">
            {show && <img src={src} alt="" draggable={false} className="size-full object-cover" />}
          </div>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-linear-to-t from-ink/45 to-transparent" />
      {/* Dots sit above the card's stretched link so they change the photo instead of opening the stay */}
      <div role="group" aria-label={`Photos of ${title}`} className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
        {photos.map((_, k) => (
          <button
            key={k}
            type="button"
            aria-label={`Show photo ${k + 1} of ${total}`}
            aria-pressed={k === current}
            onClick={() => onPick(k)}
            className="group flex h-5 items-center px-[3px]"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full transition-[width,background-color] duration-300",
                k === current ? "w-3.5 bg-white" : "w-1.5 bg-white/60 group-hover:bg-white",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
