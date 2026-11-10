/* eslint-disable @next/next/no-img-element -- uploaded photos */
import { CalendarClock } from "lucide-react";
import { PropertyImage } from "@/components/ui/property-image";
import { Tag } from "@/components/ui/primitives";
import {
  AMENITY_LABEL,
  FURNISHING_LABEL,
  GENDER_LABEL,
  LISTING_DAYS,
  PROPERTY_TYPE_LABEL,
  SHARING_LABEL,
} from "@/lib/domain/catalog";
import { availabilityLabel, formatDate, formatPhone, formatRupees, normalizeIndianMobile } from "@/lib/domain/format";
import { addDays, parseDayKey } from "@/lib/domain/time";
import type { PropertyInput } from "@/lib/domain/validation";

export function LiveWindowNote({ className }: { className?: string }) {
  const now = new Date();
  return (
    <p className={`flex gap-2.5 rounded-2xl bg-ok-bg p-4 text-[13px] leading-relaxed text-ok ${className ?? ""}`}>
      <CalendarClock aria-hidden className="mt-0.5 size-[18px] shrink-0" />
      <span>
        <b>Live for {LISTING_DAYS} days</b> after publishing — {formatDate(now)} to {formatDate(addDays(now, LISTING_DAYS))}. We&apos;ll remind
        you 3 days and 1 day before it ends.
      </span>
    </p>
  );
}

/** W6 aside · compact card as seekers will see it in search. */
export function ListingPreviewCard({ input }: { input: PropertyInput }) {
  const avail = availabilityLabel(input.availableFrom ? parseDayKey(input.availableFrom) : null);
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[var(--shadow-card)]">
      <div className="relative h-44">
        <PropertyImage src={input.photos[0]?.url} alt={input.title || "Cover photo"} seed={input.title || "new"} className="size-full" />
        <span className="absolute top-3 left-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-ok">{avail}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <Tag className="self-start">
          {PROPERTY_TYPE_LABEL[input.type]} · {SHARING_LABEL[input.sharing]} · {GENDER_LABEL[input.availableFor]}
        </Tag>
        <span className="text-base font-bold">{input.title || "Property name"}</span>
        <span className="text-[13px] text-muted-foreground">
          New · {[input.locality, input.city].filter(Boolean).join(", ") || "Location"}
        </span>
        <span className="text-lg font-extrabold text-brand">
          {input.rent ? formatRupees(input.rent) : "₹ —"}
          <span className="text-xs font-semibold text-muted-foreground">/month</span>
        </span>
      </div>
    </div>
  );
}

/** 16 · Preview listing — full detail as seekers will see it. */
export function ListingPreviewFull({ input, contactPhone }: { input: PropertyInput; contactPhone: string }) {
  const rows: [string, string][] = [
    ["Deposit", input.deposit != null ? formatRupees(input.deposit) : "Not set"],
    [input.type === "flat" ? "Size · Furnishing" : "Sharing · Furnishing", `${SHARING_LABEL[input.sharing]} · ${input.furnishing ? FURNISHING_LABEL[input.furnishing] : "Not set"}`],
    ["Amenities", [input.food ? "Food" : null, ...input.amenities.map((a) => AMENITY_LABEL[a])].filter(Boolean).join(" · ") || "None listed"],
    ["Contact", `${formatPhone(contactPhone)}${input.whatsapp ? ` · WhatsApp ${formatPhone(normalizeIndianMobile(input.whatsapp))}` : ""}`],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PropertyImage src={input.photos[0]?.url} alt="Cover photo" seed={input.title || "new"} className="h-56 w-full rounded-[20px]" iconSize={44} />
        <div className="grid grid-cols-4 gap-2">
          {input.photos.slice(1).map((p, i) => (
            <img key={p.path} src={p.url} alt={`Photo ${i + 2}`} className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Tag className="self-start">
          {PROPERTY_TYPE_LABEL[input.type]} · {SHARING_LABEL[input.sharing]} · {GENDER_LABEL[input.availableFor]}
        </Tag>
        <span className="text-[22px] font-extrabold">{input.title}</span>
        <span className="text-sm text-muted-foreground">
          {input.locality}, {input.city}
        </span>
        <span className="text-xl font-extrabold text-brand">
          {input.rent ? formatRupees(input.rent) : "—"}
          <span className="text-xs font-semibold text-muted-foreground">/month</span>
        </span>
      </div>
      <dl className="divide-y divide-line rounded-[20px] border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <LiveWindowNote />
    </div>
  );
}
