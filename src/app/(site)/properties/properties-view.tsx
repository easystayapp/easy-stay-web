"use client";

import { ChevronLeft, LocateFixed, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { useCatalog } from "@/hooks/use-catalog";
import { useCity } from "@/hooks/use-city";
import { useNearMe } from "@/hooks/use-near-me";
import { parseQuery } from "@/lib/domain/query";
import { activeChips, FiltersPanel, resetFilters } from "@/components/search/filters-panel";
import { ListingSearch } from "@/components/search/listing-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { PropertyGridSkeleton, ResultsPageSkeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import type { SearchResponse } from "@/types/api";
import {
  activeFilterCount,
  DEFAULT_RADIUS_KM,
  isNearby,
  NEARBY_RADII,
  parseFilters,
  searchHeading,
  serializeFilters,
  SORT_LABEL,
  SORTS,
  type SearchFilters,
  type SearchSort,
} from "@/lib/domain/search";

/** First page of results rendered on the server, keyed by the search it answers. */
export interface InitialResults {
  key: string;
  data: SearchResponse;
}

/** 04 Filters · 05 Search results · W2 Web results + filters */
function ResultsView({ initial }: { initial: InitialResults | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const { city, setCity } = useCity();
  const { cities } = useCatalog();
  const filters = parseFilters(params, city);
  const nearby = isNearby(filters);
  const key = serializeFilters(filters).toString();

  // Results are stored with the search they belong to; a different search shows the loader.
  const [result, setResult] = useState<InitialResults | null>(initial);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [sheet, setSheet] = useState<SearchFilters | null>(null);
  const data = result?.key === key ? result.data : null;
  const error = failed?.key === key ? failed.message : null;

  useEffect(() => {
    if (result?.key === key) return; // already have it (e.g. rendered on the server)
    let cancelled = false;
    api
      .search(parseFilters(new URLSearchParams(key), city))
      .then((r) => !cancelled && setResult({ key, data: r }))
      .catch((e) => !cancelled && setFailed({ key, message: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [key, city, result?.key]);

  const nearMe = useNearMe();
  const apply = (f: SearchFilters) => router.replace(`/properties?${serializeFilters(f)}`, { scroll: false });

  // The text may name another city or part of one ("sector 43 noida" while browsing Hyderabad).
  // The server's answer wins; until it arrives the same parsing gives the heading straight away.
  const local = parseQuery(filters.q, cities);
  const resolved = nearby ? null : (data?.resolved ?? (local.city ? { city: local.city, q: local.text, area: local.area?.name ?? null } : null));
  const resolvedCity = resolved?.city;
  useEffect(() => {
    if (resolvedCity && resolvedCity !== city) setCity(resolvedCity); // follow it, so the rest of the site does too
  }, [resolvedCity, city, setCity]);

  // Headings and area hints follow the city that was actually searched.
  const searched = resolved ? { ...filters, city: resolved.city, q: resolved.q } : filters;
  const cityInfo = cities.find((c) => c.label === searched.city);
  const areas = [...(cityInfo?.localities ?? []), ...(cityInfo?.popular ?? [])];
  const heading = nearby ? "Places near you" : searchHeading(searched, areas, resolved?.area ?? null);

  /** "Nearest first" and "Near me" need the position: ask once, then search on the server. */
  const sortBy = async (sort: SearchSort) => {
    if (sort !== "distance") return apply({ ...filters, sort, page: 1 });
    const pos = await nearMe.locate();
    if (pos) apply({ ...filters, sort, userLat: pos.lat, userLng: pos.lng, page: 1 });
  };
  /** Everything within a few km of the device, in any city, nearest first. */
  const searchNearMe = async () => {
    const pos = await nearMe.locate();
    if (pos) apply({ ...filters, q: "", userLat: pos.lat, userLng: pos.lng, radiusKm: DEFAULT_RADIUS_KM, sort: "distance", page: 1 });
  };
  const setRadius = (radiusKm: number) => apply({ ...filters, radiusKm, page: 1 });
  const chips = activeChips(filters, apply);
  const count = activeFilterCount(filters);

  return (
    <div className="container-page grid gap-8 py-6 md:py-8 lg:grid-cols-[264px_1fr]">
      {/* Web sidebar */}
      <aside className="hidden self-start rounded-[20px] border border-line lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 pt-4 pb-2.5">
          <span className="text-base font-extrabold">Filters</span>
          <button type="button" className="text-[13px] font-bold text-brand hover:text-brand-dark" onClick={() => apply(resetFilters(filters))}>
            Reset
          </button>
        </div>
        <div className="px-4 pt-3 pb-4">
          <FiltersPanel filters={filters} onChange={apply} variant="list" />
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-5">
        {/* Desktop search lives in the page, not the header (phones have the bar below). */}
        <div className="hidden md:block">
          <ListingSearch />
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/search"
            aria-label="Back to search"
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-line text-ink"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <Link
            href={`/search${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`}
            className="flex h-11 flex-1 items-center rounded-[14px] bg-surface px-4 text-sm font-bold text-ink"
          >
            {nearby ? `Near you · ${filters.radiusKm} km` : filters.q || `Anywhere in ${filters.city}`}
          </Link>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <button
            type="button"
            onClick={() => setSheet(filters)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white lg:hidden"
          >
            <SlidersHorizontal aria-hidden className="size-3.5" />
            Filters{count ? ` · ${count}` : ""}
          </button>
          {!nearby && (
            <button
              type="button"
              onClick={searchNearMe}
              disabled={nearMe.busy}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-brand bg-white px-3 text-xs font-bold text-brand-dark hover:bg-blush disabled:opacity-70"
            >
              <LocateFixed aria-hidden className="size-3.5" />
              {nearMe.busy ? "Finding you…" : "Near me"}
            </button>
          )}
          {!filters.womenFirst && (
            <button
              type="button"
              onClick={() => apply({ ...filters, womenFirst: true, page: 1 })}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-tag-line bg-white px-3 text-xs font-bold text-tag-dark hover:bg-tag-bg lg:hidden"
            >
              <Sparkles aria-hidden className="size-3.5" />
              Women-First
            </button>
          )}
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.remove}
              aria-label={`Remove filter ${c.label}`}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-tag-bg px-3 text-xs font-semibold text-tag-dark hover:bg-tag-bg-hover"
            >
              {c.label}
              <X aria-hidden className="size-3" />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[22px] leading-tight font-extrabold tracking-tight md:text-[28px]">{heading}</h1>
            <p aria-live="polite" className="min-h-5 text-sm font-semibold text-muted-foreground">
              {data ? `${data.total} ${data.total === 1 ? "place" : "places"} ${nearby ? `within ${filters.radiusKm} km` : "found"}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="text-muted-foreground">Sort</Label>
            <Select value={nearby ? "distance" : filters.sort} onValueChange={(v) => sortBy(v as SearchSort)} disabled={nearMe.busy || nearby}>
              <SelectTrigger id="sort" size="sm" className="min-w-40 text-[13px]" aria-busy={nearMe.busy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {nearby && (
          <div role="group" aria-label="Search radius" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-bold text-muted-2">Within</span>
            {(NEARBY_RADII.includes(filters.radiusKm as never) ? NEARBY_RADII : [...NEARBY_RADII, filters.radiusKm!].sort((a, b) => a - b)).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === filters.radiusKm}
                onClick={() => setRadius(r)}
                className={cx(
                  "h-9 rounded-full px-4 text-[13px] font-bold transition-colors",
                  r === filters.radiusKm ? "bg-brand text-white" : "border-[1.5px] border-line bg-white text-ink hover:border-input",
                )}
              >
                {r} km
              </button>
            ))}
          </div>
        )}

        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !data ? (
          <PropertyGridSkeleton />
        ) : data.items.length === 0 && nearby ? (
          <EmptyState
            icon={<LocateFixed className="size-7" />}
            title={`No places within ${filters.radiusKm} km`}
            body="Nearby search only shows listings that have a map pin. Try a wider radius, or search by area name."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filters.radiusKm! < NEARBY_RADII[NEARBY_RADII.length - 1] && (
                  <Button size="sm" onClick={() => setRadius(NEARBY_RADII[NEARBY_RADII.length - 1])}>
                    Search within {NEARBY_RADII[NEARBY_RADII.length - 1]} km
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => apply({ ...filters, userLat: null, userLng: null, radiusKm: null, sort: "newest", page: 1 })}>
                  Search by area
                </Button>
              </div>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title="No places match yet"
            body="Try removing a filter, searching a nearby locality, or tap “Near me” to see what's close to you."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => apply(resetFilters(filters))}>
                  Clear filters
                </Button>
                <Button size="sm" onClick={searchNearMe} loading={nearMe.busy}>
                  Near me
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
              {data.items.map((p) => (
                <PropertyCard key={p.id} p={p} />
              ))}
            </div>
            {data.pageCount > 1 && (
              <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-2 pt-4">
                {Array.from({ length: data.pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-current={n === data.page ? "page" : undefined}
                    onClick={() => apply({ ...filters, page: n })}
                    className={cx(
                      "size-11 rounded-xl text-sm font-bold",
                      n === data.page ? "bg-brand text-white" : "border-[1.5px] border-line text-ink hover:border-line-2",
                    )}
                  >
                    {n}
                  </button>
                ))}
                {data.page < data.pageCount && (
                  <Button variant="neutral" size="sm" className="h-11" onClick={() => apply({ ...filters, page: data.page + 1 })}>
                    Next
                  </Button>
                )}
              </nav>
            )}
          </>
        )}
      </section>

      {/* 04 · Mobile filters sheet */}
      {sheet && (
        <div role="dialog" aria-modal="true" aria-labelledby="filters-title" className="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <button type="button" aria-label="Close filters" onClick={() => setSheet(null)} className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-line">
              <X aria-hidden className="size-5" />
            </button>
            <span id="filters-title" className="text-lg font-extrabold">
              Filters
            </span>
            <button type="button" className="h-11 px-2 text-sm font-bold text-brand" onClick={() => setSheet(resetFilters(sheet))}>
              Reset
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FiltersPanel filters={sheet} onChange={setSheet} variant="chips" />
          </div>
          <div className="border-t border-line px-5 pt-3.5 pb-6">
            <Button
              size="lg"
              block
              onClick={() => {
                apply(sheet);
                setSheet(null);
              }}
            >
              Show properties
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertiesView({ initial }: { initial: InitialResults | null }) {
  return (
    <Suspense fallback={<ResultsPageSkeleton />}>
      <ResultsView initial={initial} />
    </Suspense>
  );
}
