"use client";

import { Info } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner } from "@/components/ui/page-spinner";
import { ErrorNote, StarIcon, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/client/api";
import { LISTING_DAYS } from "@/lib/domain/catalog";
import { parseDayKey } from "@/lib/domain/time";
import type { PropertyStats } from "@/types/api";

const weekday = (key: string) =>
  (parseDayKey(key) ?? new Date()).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Kolkata" }).slice(0, 2);

function Stats({ id }: { id: string }) {
  const [s, setS] = useState<PropertyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.stats(id).then(setS).catch((e) => setError(errorMessage(e)));
  }, [id]);
  if (error) return <div className="container-page py-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!s) return <PageSpinner />;

  const max = Math.max(1, ...s.last7.map((d) => d.count));
  const progress = s.listingDay ? Math.min(100, (s.listingDay / LISTING_DAYS) * 100) : s.status === "expired" ? 100 : 0;
  const factors: [string, number | null][] = [
    ["Property", s.factors.property],
    ["Owner", s.factors.owner],
    ["Area", s.factors.environment],
    ["Value", s.factors.value],
    ["Food", s.factors.food],
  ];
  const showRating = s.rating.count >= 3 && s.rating.average != null;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-5 sm:px-6 md:py-10">
      <PageHeader back="/my-listings" title="Statistics" subtitle={`${s.title} · ${s.locality}`} action={<StatusBadge status={s.status} />} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-[22px] bg-blush p-5">
          <span className="text-sm font-bold text-brand-dark">Total views</span>
          <span className="text-[44px] leading-none font-extrabold text-brand">{s.totalViews}</span>
          <span className="text-xs font-semibold text-muted-2">{s.periodViews} in this listing period</span>
        </div>
        <div className="flex flex-col gap-3 rounded-[22px] border border-line p-5">
          <div className="flex justify-between text-sm">
            <span className="font-bold">Listing period</span>
            <span className="font-extrabold text-brand">
              {s.daysLeft != null ? `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left` : s.status === "expired" ? "Expired" : "Not live"}
            </span>
          </div>
          <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-line-3">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Day 1 · published</span>
            <span>Day {LISTING_DAYS} · expires</span>
          </div>
        </div>
      </div>

      <figure className="flex flex-col gap-4 rounded-[22px] border border-line p-5">
        <figcaption className="text-sm font-bold">Views, last 7 days</figcaption>
        <div className="flex h-36 items-end gap-2" role="img" aria-label={`Views per day: ${s.last7.map((d) => `${weekday(d.date)} ${d.count}`).join(", ")}`}>
          {s.last7.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-bold text-muted-2">{d.count}</span>
              <div
                className={`w-full rounded-t-lg ${i === s.last7.length - 1 ? "bg-brand" : "bg-blush-line"}`}
                style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {s.last7.map((d) => (
            <span key={d.date} className="flex-1 text-center text-[11px] font-bold text-muted-foreground">
              {weekday(d.date)}
            </span>
          ))}
        </div>
      </figure>

      <div className="flex flex-col gap-4 rounded-[22px] border border-line p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Your rating</span>
          {showRating ? (
            <span className="flex items-center gap-1 text-base font-extrabold">
              <StarIcon className="size-4" />
              {s.rating.average!.toFixed(1)}
              <span className="text-xs font-semibold text-muted-foreground">· {s.rating.count} ratings</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {s.rating.count} of 3 ratings needed
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {factors.map(([k, v]) => (
            <div key={k} className="flex flex-col items-center gap-0.5 rounded-xl bg-surface py-3">
              <span className="text-base font-extrabold">{showRating && v != null ? v.toFixed(1) : "–"}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">{k}</span>
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Ratings stay with your property across reposts.</span>
      </div>

      <p className="flex gap-2.5 rounded-2xl bg-surface p-4 text-[13px] leading-relaxed text-muted-2">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
        Counted when someone opens your property, once per person per day. Who viewed it stays private.
      </p>
    </div>
  );
}

/** 18 · Property statistics + rating */
export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireOwner>{() => <Stats id={id} />}</RequireOwner>;
}
