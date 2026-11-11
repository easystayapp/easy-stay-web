import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LandingPage } from "@/components/seo/landing-page";
import { formatRupees } from "@/lib/domain/format";
import { getRepositories } from "@/lib/server/repositories";
import { areaLanding } from "@/lib/server/services/landing";

export const revalidate = 600;

const load = cache(async (city: string, area: string) => areaLanding(await getRepositories(), city, area));

type Params = { params: Promise<{ city: string; area: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city, area } = await params;
  const l = await load(city, area);
  if (!l) return { title: "Not found", robots: { index: false } };
  const { count, minRent } = l.stats;
  const path = `/pg/${l.city.id}/${l.areaSlug}`;
  const title = `PG in ${l.area}, ${l.city.label}${count ? `: ${count} ${count === 1 ? "Place" : "Places"}` : ""}${minRent ? ` from ${formatRupees(minRent)}` : ""}`;
  const description = `${count ? `${count} ${count === 1 ? "PG, hostel or room" : "PGs, hostels and rooms"} in ${l.area}, ${l.city.label}${minRent ? ` from ${formatRupees(minRent)}/month` : ""}.` : `PGs, hostels and rooms in ${l.area}, ${l.city.label}.`} See photos, rent and ratings, then call or WhatsApp the owner. No brokerage.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images: l.listings[0]?.coverUrl ? [{ url: l.listings[0].coverUrl }] : undefined },
    // Thin pages (no listings) stay out of the index until there's inventory.
    robots: count ? undefined : { index: false, follow: true },
  };
}

export default async function AreaLandingPage({ params }: Params) {
  const { city, area } = await params;
  const l = await load(city, area);
  if (!l) notFound();
  return <LandingPage l={l} />;
}
