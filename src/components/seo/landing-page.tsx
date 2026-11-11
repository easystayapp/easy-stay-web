import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { formatRupees } from "@/lib/domain/format";
import type { Landing } from "@/lib/server/services/landing";
import { absoluteUrl, jsonLd } from "@/lib/seo";

/** "Gachibowli, Hyderabad" or "Hyderabad". */
export const placeOf = (l: Landing) => (l.area ? `${l.area}, ${l.city.label}` : l.city.label);
export const landingPath = (l: Landing) => (l.areaSlug ? `/pg/${l.city.id}/${l.areaSlug}` : `/pg/${l.city.id}`);

/** Questions answered from the live numbers, so the text is accurate and unique per page. */
export function landingFaqs(l: Landing): { q: string; a: string }[] {
  const place = placeOf(l);
  const s = l.stats;
  if (!s.count) return [];
  const faqs = [
    {
      q: `What is the rent for a PG in ${place}?`,
      a:
        s.minRent === s.maxRent
          ? `Listings on EasyStay in ${place} are about ${formatRupees(s.minRent!)} per month.`
          : `Listings on EasyStay in ${place} range from ${formatRupees(s.minRent!)} to ${formatRupees(s.maxRent!)} per month, with a typical rent of ${formatRupees(s.medianRent!)}.`,
    },
    {
      q: `Are there PGs for women in ${place}?`,
      a: s.female
        ? `Yes. ${s.female} ${s.female === 1 ? "listing is" : "listings are"} for women${s.anyone ? ` and ${s.anyone} ${s.anyone === 1 ? "is" : "are"} open to anyone` : ""}.`
        : s.anyone
          ? `${s.anyone} ${s.anyone === 1 ? "listing is" : "listings are"} open to anyone. Use the gender filter to see new women-only places as they're listed.`
          : `Not right now. Save your search and check back, as new places are listed every day.`,
    },
    {
      q: `Do PGs in ${place} include food?`,
      a: s.withFood
        ? `${s.withFood} of ${s.count} ${s.count === 1 ? "place includes" : "places include"} meals. Filter by "Food available" to see them.`
        : `None of the current listings include meals; many are close to messes and tiffin services.`,
    },
    {
      q: `Is there a brokerage fee to rent through EasyStay?`,
      a: `No. You contact the owner directly by call or WhatsApp. EasyStay charges seekers nothing.`,
    },
  ];
  return faqs;
}

export function LandingPage({ l }: { l: Landing }) {
  const place = placeOf(l);
  const s = l.stats;
  const faqs = landingFaqs(l);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: `PG in ${l.city.label}`, path: `/pg/${l.city.id}` },
    ...(l.area ? [{ name: l.area, path: landingPath(l) }] : []),
  ];
  const filterHref = `/properties?${new URLSearchParams({ city: l.city.label, ...(l.area ? { q: l.area } : {}) })}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
    },
    ...(l.listings.length
      ? [{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `PGs, hostels and rooms in ${place}`,
          itemListElement: l.listings.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/properties/${p.id}`), name: p.title })),
        }]
      : []),
    ...(faqs.length
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }]
      : []),
  ];

  return (
    <div className="container-page flex flex-col gap-10 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5" />}
              {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-ink">{c.name}</span> : <Link href={c.path}>{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight md:text-[38px]">
          PGs, Hostels & Rooms in {place}
        </h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-2">
          {s.count
            ? `${s.count} ${s.count === 1 ? "place" : "places"} to rent in ${place}${s.minRent ? `, from ${formatRupees(s.minRent)} a month` : ""}. `
            : `No places listed in ${place} yet. `}
          Browse PGs, hostels, rooms and flats without signing up, then call or WhatsApp the owner directly. No brokers, no brokerage.
        </p>
        {s.count > 0 && (
          <ul className="flex flex-wrap gap-2 text-[13px] font-semibold">
            {s.medianRent && <li className="rounded-full bg-surface px-3 py-1.5">Typical rent {formatRupees(s.medianRent)}/mo</li>}
            {s.pg > 0 && <li className="rounded-full bg-surface px-3 py-1.5">{s.pg} PG / hostel</li>}
            {s.room > 0 && <li className="rounded-full bg-surface px-3 py-1.5">{s.room} {s.room === 1 ? "room" : "rooms"}</li>}
            {s.flat > 0 && <li className="rounded-full bg-surface px-3 py-1.5">{s.flat} {s.flat === 1 ? "flat" : "flats"}</li>}
            {s.female > 0 && <li className="rounded-full bg-surface px-3 py-1.5">{s.female} for women</li>}
            {s.withFood > 0 && <li className="rounded-full bg-surface px-3 py-1.5">{s.withFood} with food</li>}
          </ul>
        )}
      </header>

      <section aria-labelledby="listings-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="listings-title" className="text-[22px] font-extrabold tracking-tight">Available in {place}</h2>
          <Link href={filterHref} className="text-sm font-bold">Filter by rent, sharing & food</Link>
        </div>
        {l.listings.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {l.listings.map((p) => <PropertyCard key={p.id} p={p} imageHeight="h-[200px]" />)}
          </div>
        ) : (
          <p className="rounded-[20px] bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Nothing listed here right now. <Link href={`/pg/${l.city.id}`}>See all of {l.city.label}</Link>.
          </p>
        )}
      </section>

      {l.areas.length > 0 && (
        <section aria-labelledby="areas-title" className="flex flex-col gap-4">
          <h2 id="areas-title" className="text-[22px] font-extrabold tracking-tight">
            {l.area ? `Nearby areas in ${l.city.label}` : `PGs by area in ${l.city.label}`}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {l.areas.slice(0, 40).map((a) => (
              <li key={a.slug}>
                <Link href={`/pg/${l.city.id}/${a.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-blush-line hover:text-brand">
                  <MapPin aria-hidden className="size-3.5 text-brand" />
                  PG in {a.name}
                  <span className="text-muted-foreground">({a.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faqs.length > 0 && (
        <section aria-labelledby="faq-title" className="flex max-w-3xl flex-col gap-3">
          <h2 id="faq-title" className="text-[22px] font-extrabold tracking-tight">Renting in {place}: common questions</h2>
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl border border-line p-4">
              <h3 className="text-[15px] font-bold">{f.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-2">{f.a}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
