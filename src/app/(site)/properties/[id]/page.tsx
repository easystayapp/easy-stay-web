import type { Metadata } from "next";
import { cache } from "react";
import { GENDER_LABEL, PROPERTY_TYPE_SHORT, SHARING_LABEL } from "@/lib/domain/catalog";
import { formatRupees } from "@/lib/domain/format";
import { getRepositories } from "@/lib/server/repositories";
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
  const images = p.photos.slice(0, 4).map((url) => ({ url, alt: p.title }));
  return {
    title,
    description,
    alternates: { canonical: `/properties/${id}` },
    openGraph: { type: "website", url: absoluteUrl(`/properties/${id}`), title, description, images },
    twitter: { card: "summary_large_image", title, description, images: images.slice(0, 1).map((i) => i.url) },
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
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}
      <PropertyDetails />
    </>
  );
}
