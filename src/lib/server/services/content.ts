/** Reference data and content from the database, cached briefly per server instance. */
import { greetingFor, popularLocalities, type Catalog, type Page } from "@/lib/domain/content";
import type { PropertyType } from "@/lib/domain/types";
import type { Repositories } from "../repositories";

const TTL_MS = 60_000;
const g = globalThis as unknown as { __easyStayCatalog?: { at: number; value: Promise<Catalog> } };

async function loadCatalog(repos: Repositories): Promise<Catalog> {
  const [allCities, app, home, welcome] = await Promise.all([
    repos.content.listCities(),
    repos.content.getDoc("app"),
    repos.content.getDoc("home"),
    repos.content.getDoc("welcome"),
  ]);
  const cities = allCities.filter((c) => c.active);
  const fallback = cities[0]?.label ?? "";
  return {
    cities,
    defaultCity: cities.find((c) => c.id === app?.defaultCityId)?.label ?? fallback,
    home: home ?? { budgets: [], categories: [], steps: [] },
    welcome: welcome ?? { roles: [] },
    greetings: app?.greetings ?? { pg: "", room: "", flat: "" },
  };
}

/** Cities, default city, home sections, welcome cards and greetings. */
export function getCatalog(repos: Repositories): Promise<Catalog> {
  const cached = g.__easyStayCatalog;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = loadCatalog(repos);
  g.__easyStayCatalog = { at: Date.now(), value };
  value.catch(() => (g.__easyStayCatalog = undefined));
  return value;
}

/** Drops the cache, e.g. after the content seed/migration writes. */
export function invalidateCatalog() {
  g.__easyStayCatalog = undefined;
}

export async function defaultCity(repos: Repositories): Promise<string> {
  return (await getCatalog(repos)).defaultCity;
}

export async function popularIn(repos: Repositories, city: string): Promise<string[]> {
  return popularLocalities((await getCatalog(repos)).cities, city);
}

export async function greeting(repos: Repositories, type: PropertyType): Promise<string> {
  return greetingFor((await getCatalog(repos)).greetings, type);
}

export function getPage(repos: Repositories, slug: string): Promise<Page | null> {
  return repos.content.getPage(slug);
}
