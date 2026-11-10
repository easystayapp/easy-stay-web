import type { MetadataRoute } from "next";
import { emptyFilters } from "@/lib/domain/search";
import { getRepositories } from "@/lib/server/repositories";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Home, browse page, info pages and every live listing. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/properties"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    ...["about", "help", "terms", "privacy"].map((p) => ({ url: absoluteUrl(`/${p}`), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  try {
    const repos = await getRepositories();
    const live = await repos.properties.findCandidates(emptyFilters(""), 5000);
    const t = now.getTime();
    for (const p of live) {
      if (p.status !== "active" || (p.expiresAt && p.expiresAt.getTime() < t)) continue;
      entries.push({ url: absoluteUrl(`/properties/${p.id}`), lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (err) {
    console.error("[sitemap] could not load listings", err); // still serve the static entries
  }
  return entries;
}
