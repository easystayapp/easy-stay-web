import { parseFilters, serializeFilters } from "@/lib/domain/search";
import { getRepositories } from "@/lib/server/repositories";
import { defaultCity } from "@/lib/server/services/content";
import { searchProperties } from "@/lib/server/services/properties";
import { PropertiesView, type InitialResults } from "./properties-view";

/**
 * Search results, with the first page rendered on the server so the listings are
 * in the HTML (for search engines and a faster first paint). Changing filters then
 * fetches in the browser as before.
 */
export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") params.set(k, v);

  let initial: InitialResults | null = null;
  try {
    const repos = await getRepositories();
    const filters = parseFilters(params, await defaultCity(repos));
    initial = { key: serializeFilters(filters).toString(), data: await searchProperties(repos, filters) };
  } catch (err) {
    console.error("[properties] server render failed; the browser will load results", err);
  }
  return <PropertiesView initial={initial} />;
}
