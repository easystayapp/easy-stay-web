/** SEO helpers: canonical site URL and shared strings. */
import { PROPERTY_TYPE_SHORT } from "@/lib/domain/catalog";

export const SITE_NAME = "EasyStay";
export const SITE_TAGLINE = "Find your stay. Connect directly.";
export const DEFAULT_DESCRIPTION =
  "Find PGs, hostels, rooms and flats for rent across India. Browse without signing up, then call or WhatsApp the owner directly — no brokers, no brokerage.";

/** Canonical public origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in production. */
export function siteUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "easystay.in";
  const withProto = /^https?:\/\//.test(v) ? v : `https://${v}`;
  return withProto.replace(/\/+$/, "");
}

export const absoluteUrl = (path = "/") => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

/** "PG / Hostel" etc. for titles. */
export const typeNoun = (t: keyof typeof PROPERTY_TYPE_SHORT) => PROPERTY_TYPE_SHORT[t] ?? "Stay";

/** Safe JSON for <script type="application/ld+json"> (escapes "<"). */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
