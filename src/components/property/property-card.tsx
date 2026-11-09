"use client";

import { Heart, MapPin } from "lucide-react";
import Link from "next/link";
import { useSaved } from "@/hooks/use-saved";
import { PropertyImage } from "@/components/ui/property-image";
import { RatingPill, Tag } from "@/components/ui/primitives";
import { cx } from "@/lib/client/cx";
import { AMENITY_LABEL, FURNISHING_LABEL, GENDER_LABEL, PROPERTY_TYPE_SHORT } from "@/lib/domain/catalog";
import type { PropertyCard as Card } from "@/types/api";
import { availabilityLabel, formatRupees } from "@/lib/domain/format";

export function cardTags(p: Card): string {
  return [
    p.furnishing ? FURNISHING_LABEL[p.furnishing] : null,
    ...p.amenities.filter((a) => a !== "attached_bath").map((a) => AMENITY_LABEL[a]),
    p.food ? "Food" : null,
    GENDER_LABEL[p.availableFor],
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SaveButton({ id, className }: { id: string; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save property"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(id);
      }}
      className={cx(
        "flex size-10 items-center justify-center rounded-full bg-white/95 text-brand shadow-[0_2px_8px_rgba(30,27,31,0.12)] transition-transform active:scale-90",
        className,
      )}
    >
      <Heart aria-hidden className={cx("size-[18px]", saved && "fill-brand")} strokeWidth={2.2} />
    </button>
  );
}

function Rent({ rent, size = "md" }: { rent: number; size?: "md" | "lg" }) {
  return (
    <span className={cx("font-extrabold text-brand", size === "lg" ? "text-lg" : "text-[17px]")}>
      {formatRupees(rent)}
      <span className="text-xs font-semibold text-muted-foreground">/month</span>
    </span>
  );
}

/** Grid card used on web home, results and mobile results. */
export function PropertyCard({ p, imageHeight = "h-[180px]" }: { p: Card; imageHeight?: string }) {
  const avail = availabilityLabel(p.availableFrom ? new Date(p.availableFrom) : null);
  return (
    <Link
      href={`/properties/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-line bg-white text-ink shadow-[var(--shadow-card)] transition-shadow hover:text-ink hover:shadow-[var(--shadow-pop)]"
    >
      <div className={cx("relative", imageHeight)}>
        <PropertyImage src={p.coverUrl} alt={p.title} seed={p.id} className="size-full" />
        <span
          className={cx(
            "absolute top-3 left-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-extrabold",
            avail === "Available now" ? "text-ok" : "text-warn",
          )}
        >
          {avail}
        </span>
        <SaveButton id={p.id} className="absolute top-2.5 right-2.5" />
      </div>
      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-base leading-snug font-bold group-hover:text-brand-dark">{p.title}</span>
          <RatingPill average={p.rating.average} count={p.rating.count} />
        </div>
        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin aria-hidden className="size-3.5" />
          {p.locality}, {p.city}
        </span>
        <span className="text-xs font-semibold text-muted-2">{cardTags(p)}</span>
        <Rent rent={p.rent} size="lg" />
      </div>
    </Link>
  );
}

/** Horizontal card (mobile home "Recently added", brand UI kit). */
export function PropertyRow({ p }: { p: Card }) {
  return (
    <Link
      href={`/properties/${p.id}`}
      className="flex gap-4 rounded-[20px] border border-line bg-white p-3 text-ink shadow-[var(--shadow-card)] hover:text-ink"
    >
      <PropertyImage src={p.coverUrl} alt={p.title} seed={p.id} className="size-[108px] shrink-0 rounded-[14px]" iconSize={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Tag className="self-start">
          {PROPERTY_TYPE_SHORT[p.type]} · {GENDER_LABEL[p.availableFor]}
        </Tag>
        <span className="truncate text-base font-bold">{p.title}</span>
        <span className="text-[13px] text-muted-foreground">
          {p.locality}, {p.city}
        </span>
        <Rent rent={p.rent} />
      </div>
    </Link>
  );
}
