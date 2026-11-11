import type { Metadata } from "next";
import { cache } from "react";
import { GENDER_LABEL, PROPERTY_TYPE_SHORT, SHARING_LABEL } from "@/lib/domain/catalog";
import { formatRupees } from "@/lib/domain/format";
import Link from "next/link";
import { areaName, slugify } from "@/lib/domain/landing";
import { getRepositories } from "@/lib/server/repositories";
import { getCatalog } from "@/lib/server/services/content";
import { getPropertyDetail } from "@/lib/server/services/properties";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/seo";
import { PropertyDetails } from "./property-details";

/** One fetch shared by metadata and the page. Null when missing, rented or expired. */
const load = cache(async (id: string) => {
  try {
    return await getPropertyDetail(await getRepositories(), id, null);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  if (!p) return { title: "Property not available", robots: { index: false, follow: true } };

  const type = PROPERTY_TYPE_SHORT[p.type];
  const title = `${p.title} — ${type} in ${p.locality}, ${p.city}`;
  const summary = `${SHARING_LABEL[p.sharing]} ${type} for ${GENDER_LABEL[p.availableFor].toLowerCase()} in ${p.locality}, ${p.city}. ${formatRupees(p.rent)}/month. Contact the owner directly on ${SITE_NAME}.`;
  const description = p.description ? `${summary} ${p.description}`.slice(0, 300) : summary;
  return {
    title,
    description,
    alternates: { canonical: `/properties/${id}` },
    // Share image: the generated card in ./opengraph-image.tsx (photo, rent, area, rating).
    openGraph: { type: "website", url: absoluteUrl(`/properties/${id}`), title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await load(id);
  const ld =
    p && {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: p.title,
      url: absoluteUrl(`/properties/${id}`),
      description: p.description || undefined,
      image: p.photos.slice(0, 6),
      priceRange: `${formatRupees(p.rent)} per month`,
      address: { "@type": "PostalAddress", streetAddress: p.address || undefined, addressLocality: p.locality, addressRegion: p.city, addressCountry: "IN" },
      ...(p.geo && { geo: { "@type": "GeoCoordinates", latitude: p.geo.lat, longitude: p.geo.lng } }),
      // Only real ratings; never emit an empty aggregate.
      ...(p.rating.count > 0 && p.rating.average !== null && {
        aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.rating.average.toFixed(1)), ratingCount: p.rating.count, bestRating: 5, worstRating: 1 },
      }),
    };
  // City / area landing pages this listing belongs to (breadcrumbs + internal links).
  const city = p ? (await getCatalog(await getRepositories())).cities.find((c) => c.label.toLowerCase() === p.city.toLowerCase()) : null;
  const area = p ? areaName(p.locality) : "";
  const areaPath = city && slugify(area) ? `/pg/${city.id}/${slugify(area)}` : null;
  const crumbs =
    p && city
      ? [
          { name: "Home", path: "/" },
          { name: `PG in ${city.label}`, path: `/pg/${city.id}` },
          ...(areaPath ? [{ name: area, path: areaPath }] : []),
          { name: p.title, path: `/properties/${id}` },
        ]
      : null;
  const breadcrumbLd = crumbs && {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };

  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd ? [ld, breadcrumbLd] : ld) }} />}
      <PropertyDetails />
      {city && (
        <nav aria-label="More places nearby" className="container-page pb-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface px-5 py-4 text-sm">
            <span className="font-bold">Explore more:</span>
            {areaPath && <Link href={areaPath}>PGs & hostels in {area}</Link>}
            <Link href={`/pg/${city.id}`}>All PGs in {city.label}</Link>
          </div>
        </nav>
      )}
    </>
  );
}
