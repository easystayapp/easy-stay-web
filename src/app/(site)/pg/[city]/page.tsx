import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LandingPage } from "@/components/seo/landing-page";
import { formatRupees } from "@/lib/domain/format";
import { getRepositories } from "@/lib/server/repositories";
import { cityLanding } from "@/lib/server/services/landing";

/** Rebuilt at most every 10 minutes, so new listings show up without a deploy. */
export const revalidate = 600;
/** Pages are built on first visit, then cached at the edge and refreshed in the background (ISR). */
export const generateStaticParams = async () => [];

const load = cache(async (city: string) => cityLanding(await getRepositories(), city));

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const l = await load((await params).city);
  if (!l) return { title: "Not found", robots: { index: false } };
  const { count, minRent } = l.stats;
  const title = `PG in ${l.city.label}: ${count ? `${count} ` : ""}${count === 1 ? "Place" : "PGs, Hostels & Rooms"} for Rent`;
  const description = `${count ? `${count} ${count === 1 ? "PG, hostel, room or flat" : "PGs, hostels, rooms and flats"} in ${l.city.label}, ${l.city.state}${minRent ? ` from ${formatRupees(minRent)}/month` : ""}.` : `PGs, hostels, rooms and flats in ${l.city.label}.`} Contact owners directly on call or WhatsApp. No brokerage.`;
  return {
    title,
    description,
    alternates: { canonical: `/pg/${l.city.id}` },
    openGraph: { title, description, url: `/pg/${l.city.id}`, images: l.listings[0]?.coverUrl ? [{ url: l.listings[0].coverUrl }] : undefined },
    robots: count ? undefined : { index: false, follow: true },
  };
}

export default async function CityLandingPage({ params }: { params: Promise<{ city: string }> }) {
  const l = await load((await params).city);
  if (!l) notFound();
  return <LandingPage l={l} />;
}
