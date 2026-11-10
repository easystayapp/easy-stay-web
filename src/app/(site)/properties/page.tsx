"use client";

import { ChevronLeft, SearchX, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { useCatalog } from "@/hooks/use-catalog";
import { useCity } from "@/hooks/use-city";
import { activeChips, FiltersPanel, resetFilters } from "@/components/search/filters-panel";
import { ListingSearch } from "@/components/search/listing-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import type { SearchResponse } from "@/types/api";
import {
  activeFilterCount,
  parseFilters,
  searchHeading,
  serializeFilters,
  SORT_LABEL,
  SORTS,
  type SearchFilters,
  type SearchSort,
} from "@/lib/domain/search";

/** 04 Filters · 05 Search results · W2 Web results + filters */
function ResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const { city } = useCity();
  const { cities } = useCatalog();
  const filters = parseFilters(params, city);
  const cityInfo = cities.find((c) => c.label === filters.city);
  const areas = [...(cityInfo?.localities ?? []), ...(cityInfo?.popular ?? [])];
  const key = serializeFilters(filters).toString();

  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SearchFilters | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset while the new query loads
    setData(null);
    setError(null);
    api
      .search(parseFilters(new URLSearchParams(key), city))
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [key, city]);

  const apply = (f: SearchFilters) => router.replace(`/properties?${serializeFilters(f)}`, { scroll: false });
  const chips = activeChips(filters, apply);
  const count = activeFilterCount(filters);

  return (
    <div className="container-page grid gap-8 py-6 md:py-8 lg:grid-cols-[280px_1fr]">
      {/* Web sidebar */}
      <aside className="hidden self-start rounded-[20px] border border-line lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-gutter:stable] lg:[scrollbar-width:thin]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 pt-5 pb-3">
          <span className="text-lg font-extrabold">Filters</span>
          <button type="button" className="text-sm font-bold text-brand hover:text-brand-dark" onClick={() => apply(resetFilters(filters))}>
            Reset
          </button>
        </div>
        <div className="px-5 pt-4 pb-5">
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
            {filters.q || `Anywhere in ${filters.city}`}
          </Link>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <button
            type="button"
            onClick={() => setSheet(filters)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-bold text-white lg:hidden"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filters{count ? ` · ${count}` : ""}
          </button>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.remove}
              aria-label={`Remove filter ${c.label}`}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-blush px-3.5 text-[13px] font-semibold text-brand-dark hover:bg-blush-2"
            >
              {c.label}
              <X aria-hidden className="size-3.5" />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-extrabold tracking-tight md:text-[28px]">
            {searchHeading(filters, areas)}
            {data && (
              <span className="ml-2 text-base font-semibold text-muted-foreground">
                <span className="sr-only">, </span>
                {data.total}
                <span className="sr-only"> {data.total === 1 ? "place" : "places"}</span>
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="text-muted-foreground">Sort</Label>
            <Select value={filters.sort} onValueChange={(v) => apply({ ...filters, sort: v as SearchSort, page: 1 })}>
              <SelectTrigger id="sort" size="sm" className="min-w-40 text-[13px]">
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

        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !data ? (
          <PageSpinner label="Loading properties" />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title="No places match yet"
            body="Try removing a filter or searching a nearby locality. New listings go live every day."
            action={
              <Button variant="outline" size="sm" onClick={() => apply(resetFilters(filters))}>
                Clear filters
              </Button>
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

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResultsView />
    </Suspense>
  );
}
