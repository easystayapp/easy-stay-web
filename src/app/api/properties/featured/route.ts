import { DEFAULT_CITY } from "@/lib/domain/catalog";
import { route } from "@/lib/server/http";
import { featuredProperties } from "@/lib/server/services/properties";

/** Top 5 rated stays in a city, mixed across property types. */
export const GET = route(async (ctx) => {
  const city = new URL(ctx.req.url).searchParams.get("city") || DEFAULT_CITY;
  return { items: await featuredProperties(ctx.repos, city) };
});
