"use client";

import { BedDouble, Building2, House, MapPin, Search, SlidersHorizontal, Users, Utensils, Venus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { useAuth } from "@/hooks/use-auth";
import { useCity } from "@/hooks/use-city";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSpinner } from "@/components/ui/page-spinner";
import { api } from "@/lib/client/api";
import { welcomeSeen } from "@/lib/client/prefs";
import { CITIES, popularLocalities } from "@/lib/domain/catalog";
import type { PropertyCard as Card } from "@/types/api";
import { formatRupees } from "@/lib/domain/format";
import { emptyFilters, serializeFilters, type SearchFilters } from "@/lib/domain/search";
import type { PropertyType } from "@/lib/domain/types";

const BUDGETS = [
  { label: "Any budget", min: null, max: null },
  { label: "Under ₹5k", min: null, max: 5000 },
  { label: "₹5k – ₹10k", min: 5000, max: 10000 },
  { label: "₹10k – ₹20k", min: 10000, max: 20000 },
  { label: "₹20k+", min: 20000, max: null },
];

const CATEGORIES: { name: string; hint: string; icon: typeof House; f: Partial<SearchFilters> }[] = [
  { name: "PG / Hostel", hint: "1–6 sharing, meals", icon: Building2, f: { types: ["pg"] } },
  { name: "Room", hint: "Single room · 1 RK", icon: BedDouble, f: { types: ["room"] } },
  { name: "Flat", hint: "1–4 BHK", icon: House, f: { types: ["flat"] } },
  { name: "Girls PG", hint: "Female only", icon: Venus, f: { types: ["pg"], genders: ["female"] } },
  { name: "Co-living", hint: "Open to anyone", icon: Users, f: { genders: ["anyone"] } },
  { name: "With food", hint: "Meals included", icon: Utensils, f: { food: "yes" } },
];

export default function HomePage() {
  const router = useRouter();
  const { city, setCity } = useCity();
  const { me } = useAuth();
  const [items, setItems] = useState<Card[] | null>(null);
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
    return () => {
      cancelled = true;
    };
  }, [city]);

  const href = (f: Partial<SearchFilters>) => `/properties?${serializeFilters({ ...emptyFilters(city), ...f })}`;
  const featured = items?.[0];

  return (
    <>
      <section className="bg-blush">
        <div className="container-page flex flex-wrap items-center gap-12 py-10 md:py-16">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5 md:gap-6">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger
                size="sm"
                aria-label="Your city"
                className="h-9! self-start rounded-full border-0 bg-white pr-3 pl-3 text-[13px] font-bold text-brand-dark"
              >
                <MapPin aria-hidden className="size-4 text-brand" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
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
                const b = BUDGETS[budget];
                router.push(href({ q: q.trim(), types: type ? [type] : [], minRent: b.min, maxRent: b.max }));
              }}
              className="flex flex-wrap gap-2.5 rounded-[20px] bg-white p-2.5 shadow-[var(--shadow-pop)]"
            >
              <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1 rounded-xl bg-surface px-3.5 py-2">
                <Label htmlFor="hero-q" className="text-[11px] text-muted-foreground">Location</Label>
                <Input
                  id="hero-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Area in ${city}`}
                  className="h-auto rounded-none border-0 bg-transparent p-0 text-[15px] font-bold focus-visible:ring-0"
                />
              </div>
              <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1 rounded-xl bg-surface px-3.5 py-2">
                <Label htmlFor="hero-type" className="text-[11px] text-muted-foreground">Type</Label>
                <Select value={type || "any"} onValueChange={(v) => setType(v === "any" ? "" : (v as PropertyType))}>
                  <SelectTrigger id="hero-type" className="h-auto! w-full border-0 bg-transparent p-0 text-[15px] font-bold shadow-none focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="pg">PG / Hostel</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1 rounded-xl bg-surface px-3.5 py-2">
                <Label htmlFor="hero-budget" className="text-[11px] text-muted-foreground">Budget</Label>
                <Select value={String(budget)} onValueChange={(v) => setBudget(Number(v))}>
                  <SelectTrigger id="hero-budget" className="h-auto! w-full border-0 bg-transparent p-0 text-[15px] font-bold shadow-none focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {BUDGETS.map((b, i) => (
                      <SelectItem key={b.label} value={String(i)}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="submit"
                className="flex min-h-[52px] flex-[1_1_120px] items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-extrabold text-white hover:bg-brand-dark"
              >
                <Search aria-hidden className="size-[18px]" strokeWidth={2.4} />
                Search
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-bold text-muted-foreground">Popular:</span>
              {popularLocalities(city).map((l) => (
                <Link key={l} href={href({ q: l })} className="rounded-full bg-white px-3 py-2 font-semibold text-ink hover:text-brand">
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
          <div className="relative hidden h-[420px] min-w-0 flex-[1_1_360px] items-center justify-center rounded-[32px] bg-blush-2 md:flex">
            <Image src="/brand/logo-mark.png" alt="" width={220} height={194} className="h-auto w-[46%] max-w-[220px] opacity-90" />
            {featured && (
              <Link
                href={`/properties/${featured.id}`}
                className="absolute right-6 bottom-6 left-6 flex max-w-[320px] gap-3 rounded-[18px] bg-white p-3 text-ink shadow-[0_10px_28px_rgba(30,27,31,0.12)] hover:text-ink"
              >
                <span className="size-16 shrink-0 rounded-xl bg-tint-2" />
                <span className="flex flex-col justify-center gap-0.5">
                  <span className="text-sm font-bold">{featured.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {featured.rating.count >= 3 && featured.rating.average ? `★ ${featured.rating.average.toFixed(1)} · ` : ""}
                    {featured.locality}
                  </span>
                  <span className="text-sm font-extrabold text-brand">{formatRupees(featured.rent)}/mo</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="container-page pt-12 md:pt-14">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">Browse by type</h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              href={href(c.f)}
              className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-line px-[18px] py-5 text-ink hover:border-blush-line hover:text-ink"
            >
              <c.icon aria-hidden className="mb-1 size-6 text-brand" />
              <span className="text-[17px] font-extrabold">{c.name}</span>
              <span className="text-[13px] text-muted-foreground">{c.hint}</span>
            </Link>
          ))}
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

      <section className="container-page pt-14 md:pt-16">
        <h2 className="mb-5 text-[22px] font-extrabold tracking-tight md:text-[26px]">How EasyStay works</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {[
            ["Browse freely", "Search, filter and open any listing without an account. Only available places are shown."],
            ["Log in to connect", "Google or mobile OTP — and you're right back on the property you picked."],
            ["Call or WhatsApp", "Talk to the owner directly, arrange a visit, and rate the place afterwards."],
          ].map(([t, b], i) => (
            <li key={t} className="flex flex-col gap-2.5 rounded-[22px] bg-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand font-extrabold text-white">{i + 1}</span>
              <span className="text-lg font-extrabold">{t}</span>
              <span className="text-sm leading-relaxed text-muted-2">{b}</span>
            </li>
          ))}
        </ol>
      </section>

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
