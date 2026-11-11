/**
 * Server data for SEO landing pages: /pg/[city] and /pg/[city]/[area].
 * Built from live listings, so pages only exist where there is real inventory.
 */
import type { City } from "@/lib/domain/content";
import { areaName, inArea, landingStats, slugify, type LandingStats } from "@/lib/domain/landing";
import { isPubliclyVisible } from "@/lib/domain/listing";
import { emptyFilters, sortProperties } from "@/lib/domain/search";
import type { Property } from "@/lib/domain/types";
import type { PropertyCard } from "@/types/api";
import type { Repositories } from "../repositories";
import { getCatalog } from "./content";
import { toCard } from "./mappers";

export interface AreaLink {
  name: string;
  slug: string;
  count: number;
}

export interface Landing {
  city: Pick<City, "id" | "label" | "state">;
  area: string | null;
  areaSlug: string | null;
  stats: LandingStats;
  listings: PropertyCard[];
  /** Areas of this city that have listings, busiest first. */
  areas: AreaLink[];
}

async function liveIn(repos: Repositories, city: City): Promise<Property[]> {
  const now = new Date();
  const all = await repos.properties.findCandidates(emptyFilters(city.label), 1000);
  return all.filter((p) => isPubliclyVisible(p, now) && p.location.city.toLowerCase() === city.label.toLowerCase());
}

function areasOf(list: Property[]): AreaLink[] {
  const byArea = new Map<string, AreaLink>();
  for (const p of list) {
    const name = areaName(p.location.locality);
    const slug = slugify(name);
    if (!slug) continue;
    const a = byArea.get(slug) ?? { name, slug, count: 0 };
    a.count++;
    byArea.set(slug, a);
  }
  return [...byArea.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function findCity(repos: Repositories, slug: string): Promise<City | null> {
  const { cities } = await getCatalog(repos);
  return cities.find((c) => c.id === slug || slugify(c.label) === slug) ?? null;
}

const rank = (list: Property[]) => sortProperties(list, "top_rated").sort((a, b) => b.ratingSummary.count - a.ratingSummary.count);

export async function cityLanding(repos: Repositories, citySlug: string): Promise<Landing | null> {
  const city = await findCity(repos, citySlug);
  if (!city) return null;
  const list = await liveIn(repos, city);
  return {
    city: { id: city.id, label: city.label, state: city.state },
    area: null,
    areaSlug: null,
    stats: landingStats(list),
    listings: sortProperties(list, "newest").slice(0, 24).map(toCard),
    areas: areasOf(list),
  };
}

export async function areaLanding(repos: Repositories, citySlug: string, areaSlug: string): Promise<Landing | null> {
  const city = await findCity(repos, citySlug);
  if (!city) return null;
  const list = await liveIn(repos, city);
  const areas = areasOf(list);
  // The area may have listings, or be a known locality of the city with none yet.
  const known = areas.find((a) => a.slug === areaSlug)?.name ?? [...city.popular, ...city.localities].find((l) => slugify(areaName(l)) === areaSlug);
  if (!known) return null;
  const name = areaName(known);
  const here = list.filter((p) => inArea(p, name));
  return {
    city: { id: city.id, label: city.label, state: city.state },
    area: name,
    areaSlug,
    stats: landingStats(here),
    listings: rank(here).slice(0, 24).map(toCard),
    areas: areas.filter((a) => a.slug !== areaSlug),
  };
}

/** Every landing page worth indexing (cities, and areas with at least one listing). */
export async function landingIndex(repos: Repositories): Promise<{ city: string; areas: string[]; updated: Date | null }[]> {
  const { cities } = await getCatalog(repos);
  const out = [];
  for (const c of cities.filter((c) => c.active !== false)) {
    const list = await liveIn(repos, c);
    const updated = list.reduce<Date | null>((m, p) => (!m || p.updatedAt > m ? p.updatedAt : m), null);
    out.push({ city: c.id, areas: areasOf(list).map((a) => a.slug), updated });
  }
  return out;
}
