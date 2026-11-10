import { route } from "@/lib/server/http";
import { defaultCity } from "@/lib/server/services/content";
import { searchSuggestions } from "@/lib/server/services/properties";

export const GET = route(async (ctx) => {
  const p = new URL(ctx.req.url).searchParams;
  return { items: await searchSuggestions(ctx.repos, p.get("q") ?? "", p.get("city") || (await defaultCity(ctx.repos))) };
});
