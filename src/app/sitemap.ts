import type { MetadataRoute } from "next";
import { emptyFilters } from "@/lib/domain/search";
import { getRepositories } from "@/lib/server/repositories";
import { landingIndex } from "@/lib/server/services/landing";
import { GUIDES } from "@/content/guides";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Home, browse page, city/area landing pages, info pages and every live listing (with photos). Refreshed hourly. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/properties"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/guides"), changeFrequency: "weekly", priority: 0.6 },
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...["about", "help", "terms", "privacy"].map((p) => ({ url: absoluteUrl(`/${p}`), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  try {
    const repos = await getRepositories();
    // Landing pages: every city, and every area that has at least one live listing.
    for (const c of await landingIndex(repos)) {
      if (!c.areas.length) continue; // no live listings: the page is noindex, so keep it out
      entries.push({ url: absoluteUrl(`/pg/${c.city}`), lastModified: c.updated ?? now, changeFrequency: "daily", priority: 0.85 });
      for (const a of c.areas) {
        entries.push({ url: absoluteUrl(`/pg/${c.city}/${a}`), lastModified: c.updated ?? now, changeFrequency: "daily", priority: 0.8 });
      }
    }
    const live = await repos.properties.findCandidates(emptyFilters(""), 5000);
    const t = now.getTime();
    for (const p of live) {
      if (p.status !== "active" || (p.expiresAt && p.expiresAt.getTime() < t)) continue;
      entries.push({
        url: absoluteUrl(`/properties/${p.id}`),
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        // Listing photos, so they can appear in image search (absolute URLs only).
        images: p.photos.slice(0, 5).map((ph) => (ph.url.startsWith("http") ? ph.url : absoluteUrl(ph.url))),
      });
    }
  } catch (err) {
    console.error("[sitemap] could not load listings", err); // still serve the static entries
  }
  return entries;
}
