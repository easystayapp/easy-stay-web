"use client";

import { ArrowRight, BedDouble, Building2, CalendarClock, ChevronDown, House, MapPin, PhoneCall, Search, ShieldCheck, SlidersHorizontal, Star, TrendingUp, Users, Utensils, Venus, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeaturedCarousel } from "@/components/property/featured-carousel";
import { PropertyCard } from "@/components/property/property-card";
import { LocalityCombobox } from "@/components/search/locality-combobox";
import { useAuth } from "@/hooks/use-auth";
import { useCity } from "@/hooks/use-city";
import { ButtonLink } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { welcomeSeen } from "@/lib/client/prefs";
import { useCatalog } from "@/hooks/use-catalog";
import { popularLocalities, type CategoryIcon, type HighlightIcon } from "@/lib/domain/content";
import type { FeaturedStay, PropertyCard as Card } from "@/types/api";
import { emptyFilters, serializeFilters, type SearchFilters } from "@/lib/domain/search";
import type { PropertyType } from "@/lib/domain/types";

/* Hero search bar: one bar of icon-led segments (stacked boxes on phones). */
const SEGMENT =
  "flex min-h-14 min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors max-md:bg-surface md:hover:bg-surface md:focus-within:bg-surface";
const SELECT_SEGMENT = "h-auto! border-0 shadow-none focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-surface";
const SEGMENT_LABEL = "text-[11px] leading-4 font-bold tracking-[0.06em] text-muted-foreground uppercase";
const DIVIDER = "my-3 hidden w-px shrink-0 bg-line md:block";

function SegmentIcon({ icon: Icon }: { icon: typeof MapPin }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blush text-brand">
      <Icon aria-hidden className="size-[18px]" />
    </span>
  );
}

const HIGHLIGHT_ICON: Record<HighlightIcon, typeof House> = {
  shield: ShieldCheck,
  phone: PhoneCall,
  star: Star,
  calendar: CalendarClock,
};

/** Category icons are code; which categories exist (and their filters) comes from the database. */
const CATEGORY_ICON: Record<CategoryIcon, typeof House> = {
  pg: Building2,
  room: BedDouble,
  flat: House,
  female: Venus,
  coliving: Users,
  food: Utensils,
};

export default function HomePage() {
  const router = useRouter();
  const { cities, home } = useCatalog();
  const { city, setCity } = useCity();
  const { me } = useAuth();
  const [items, setItems] = useState<Card[] | null>(null);
  const [featured, setFeatured] = useState<FeaturedStay[] | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<PropertyType | "">("");
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    if (!welcomeSeen() && window.matchMedia("(max-width: 767px)").matches) router.replace("/welcome");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    api
      .search({ ...emptyFilters(city) })
      .then((r) => !cancelled && setItems(r.items.slice(0, 8)))
      .catch(() => !cancelled && setItems([]));
    api
      .featured(city)
      .then((r) => !cancelled && setFeatured(r.items))
      .catch(() => !cancelled && setFeatured([]));
    return () => {
      cancelled = true;
    };
  }, [city]);

  const href = (f: Partial<SearchFilters>) => `/properties?${serializeFilters({ ...emptyFilters(city), ...f })}`;

  return (
    <>
      <section className="bg-blush">
        <div className="container-page flex flex-wrap items-center gap-12 py-10 md:py-16">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5 md:gap-6">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger
                size="sm"
                aria-label="Your city"
                className="h-9! gap-1.5 self-start rounded-full! border-0 bg-white pr-3 pl-3 text-[13px] font-extrabold text-brand-dark shadow-[0_1px_3px_rgba(30,27,31,0.08)] ring-1 ring-black/[0.04] transition-colors hover:bg-blush focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-blush"
              >
                <MapPin aria-hidden className="size-4 text-brand" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.label}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <h1 className="text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em]">
              Find your stay.
              <br />
              <span className="text-brand">Connect directly.</span>
            </h1>
            <p className="max-w-[520px] text-base leading-relaxed text-muted-2 md:text-lg">
              Browse available places without signing up. When you find the one, call or WhatsApp the owner — no
              brokers in between.
            </p>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const b = home.budgets[budget];
                router.push(href({ q: q.trim(), types: type ? [type] : [], minRent: b?.minRent ?? null, maxRent: b?.maxRent ?? null }));
              }}
              className="flex flex-wrap items-stretch gap-1.5 rounded-[22px] border border-white bg-white p-2 shadow-[var(--shadow-pop)] md:flex-nowrap"
            >
              <div
                className={cx(SEGMENT, "relative flex-[2_1_240px] cursor-text")}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("[role=listbox]")) document.getElementById("hero-q")?.focus();
                }}
              >
                <SegmentIcon icon={MapPin} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <label htmlFor="hero-q" className={cx(SEGMENT_LABEL, "cursor-text")}>
                    Location
                  </label>
                  <LocalityCombobox
                    id="hero-q"
                    onListing={(href) => router.push(href)}
                    city={city}
                    value={q}
                    onChange={setQ}
                    placeholder={`Area in ${city}`}
                    className="static"
                    inputClassName="h-6 text-[15px] leading-6 font-bold text-ink placeholder:font-semibold placeholder:text-muted-foreground/80"
                    listClassName="top-[calc(100%+12px)] left-0 w-full"
                  />
                </span>
              </div>
              <span aria-hidden className={DIVIDER} />
              <Select value={type || "any"} onValueChange={(v) => setType(v === "any" ? "" : (v as PropertyType))}>
                <SelectTrigger id="hero-type" aria-label="Property type" className={cx(SEGMENT, SELECT_SEGMENT, "flex-[1_1_160px]")}>
                  <SegmentIcon icon={Building2} />
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className={SEGMENT_LABEL}>Type</span>
                    <span className="truncate text-[15px] leading-6 font-bold text-ink">
                      <SelectValue />
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  <SelectItem value="pg">PG / Hostel</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
              <span aria-hidden className={DIVIDER} />
              <Select value={String(budget)} onValueChange={(v) => setBudget(Number(v))}>
                <SelectTrigger id="hero-budget" aria-label="Budget" className={cx(SEGMENT, SELECT_SEGMENT, "flex-[1_1_170px]")}>
                  <SegmentIcon icon={Wallet} />
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className={SEGMENT_LABEL}>Budget</span>
                    <span className="truncate text-[15px] leading-6 font-bold text-ink">
                      <SelectValue />
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {home.budgets.map((b, i) => (
                    <SelectItem key={b.label} value={String(i)}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="submit"
                className="flex min-h-14 flex-[1_1_100%] items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-[15px] font-extrabold text-white shadow-[0_8px_18px_rgba(214,40,67,0.28)] transition-[background-color,transform] hover:bg-brand-dark active:scale-[0.98] md:flex-none"
              >
                <Search aria-hidden className="size-[18px]" strokeWidth={2.4} />
                Search
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="mr-1 flex items-center gap-1.5 font-bold text-muted-2">
                <TrendingUp aria-hidden className="size-4 text-brand" />
                Popular in {city}
              </span>
              {popularLocalities(cities, city).map((l) => (
                <Link
                  key={l}
                  href={href({ q: l })}
                  className="rounded-full border border-white bg-white/80 px-3.5 py-2 font-semibold text-ink transition-colors hover:border-blush-line hover:bg-white hover:text-brand-dark"
                >
                  {l}
                </Link>
              ))}
              <Link
                href={href({})}
                aria-label="All filters"
                className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-3 py-2 font-bold text-brand md:hidden"
              >
                <SlidersHorizontal aria-hidden className="size-4" />
                Filters
              </Link>
            </div>
          </div>
          <div className="hidden min-w-0 flex-[1_1_360px] md:block">
            {featured === null ? (
              <div className="h-[420px] animate-pulse rounded-[32px] bg-blush-2" />
            ) : featured.length ? (
              <FeaturedCarousel items={featured} city={city} />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-[32px] bg-blush-2">
                <Image src="/brand/logo-mark.png" alt="" width={220} height={194} className="h-auto w-[46%] max-w-[220px] opacity-90" />
              </div>
            )}
          </div>
        </div>
      </section>

      {home.highlights.length > 0 && (
        <section aria-label="Why EasyStay" className="container-page pt-8 md:pt-10">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {home.highlights.map((h) => {
              const Icon = HIGHLIGHT_ICON[h.icon] ?? ShieldCheck;
              return (
                <li key={h.title} className="flex items-start gap-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-brand">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-extrabold">{h.title}</span>
                    <span className="text-[13px] leading-relaxed text-muted-foreground">{h.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="container-page pt-12 md:pt-14">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">Browse by type</h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {home.categories.map((c) => {
            const Icon = CATEGORY_ICON[c.icon] ?? House;
            const f: Partial<SearchFilters> = { types: c.types, genders: c.genders, food: c.food == null ? null : c.food ? "yes" : "no" };
            return (
              <Link
                key={c.title}
                href={href(f)}
                className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-line px-[18px] py-5 text-ink hover:border-blush-line hover:text-ink"
              >
                <Icon aria-hidden className="mb-1 size-6 text-brand" />
                <span className="text-[17px] font-extrabold">{c.title}</span>
                <span className="text-[13px] text-muted-foreground">{c.hint}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page pt-12 md:pt-14">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-extrabold tracking-tight md:text-[26px]">Available near {city}</h2>
          <Link href={href({})} className="text-sm font-bold">
            See all properties
          </Link>
        </div>
        {items === null ? (
          <PageSpinner />
        ) : items.length === 0 ? (
          <p className="rounded-[20px] bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            No listings in {city} yet. Check back soon — or list your own place.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {items.map((p) => (
              <PropertyCard key={p.id} p={p} imageHeight="h-[200px]" />
            ))}
          </div>
        )}
      </section>

      {cities.length > 1 && (
        <section className="container-page pt-14 md:pt-16">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px] font-extrabold tracking-tight md:text-[26px]">Explore cities</h2>
            <span className="text-sm text-muted-foreground">Stays near the main job hubs</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/properties?${serializeFilters({ ...emptyFilters(c.label) })}`}
                onClick={() => setCity(c.label)}
                className="group flex flex-col gap-3 rounded-[22px] border-[1.5px] border-line p-5 text-ink transition-colors hover:border-blush-line hover:bg-blush/40 hover:text-ink"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-lg font-extrabold">{c.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.state} · {c.localities.length} areas
                    </span>
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-blush text-brand transition-transform group-hover:translate-x-0.5">
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {c.popular.slice(0, 4).map((l) => (
                    <span key={l} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted-2">
                      {l}
                    </span>
                  ))}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pt-14 md:pt-16">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">How EasyStay works</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {home.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2.5 rounded-[22px] bg-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand font-extrabold text-white">{i + 1}</span>
              <span className="text-lg font-extrabold">{step.title}</span>
              <span className="text-sm leading-relaxed text-muted-2">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {home.faqs.length > 0 && (
        <section className="container-page pt-14 md:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] font-extrabold tracking-tight md:text-[26px]">Questions, answered</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                More in the <Link href="/help">help centre</Link>.
              </p>
            </div>
            <div className="flex flex-col divide-y divide-line rounded-[22px] border-[1.5px] border-line">
              {home.faqs.map((f) => (
                <details key={f.question} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold outline-none focus-visible:text-brand">
                    {f.question}
                    <ChevronDown aria-hidden className="size-4 shrink-0 text-brand transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pt-2.5 pr-8 text-sm leading-relaxed text-muted-2">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-page py-14 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-ink p-8 text-white md:p-10">
          <div className="flex flex-[1_1_420px] flex-col gap-2">
            <span className="text-[26px] font-extrabold tracking-tight md:text-[28px]">Own a PG, room or flat?</span>
            <span className="text-base leading-normal text-[#D9D2D4]">
              Turn on owner tools on your account and list in about 2 minutes. Free 15-day listings, repost in one click.
            </span>
          </div>
          <ButtonLink href={me?.ownerToolsOn ? "/my-listings/new" : "/owner"} variant="coral" size="lg" className="text-base">
            List your property
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
