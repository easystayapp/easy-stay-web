import { route } from "@/lib/server/http";
import { defaultCity } from "@/lib/server/services/content";
import { topOwners } from "@/lib/server/services/properties";

/** Best-rated owners in a city, with their rating and rating count. */
export const GET = route(async (ctx) => {
  const city = new URL(ctx.req.url).searchParams.get("city") || (await defaultCity(ctx.repos));
  return { items: await topOwners(ctx.repos, city) };
});
