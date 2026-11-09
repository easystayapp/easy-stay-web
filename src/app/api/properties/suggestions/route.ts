import { DEFAULT_CITY } from "@/lib/domain/catalog";
import { route } from "@/lib/server/http";
import { searchSuggestions } from "@/lib/server/services/properties";

export const GET = route(async (ctx) => {
  const p = new URL(ctx.req.url).searchParams;
  return { items: await searchSuggestions(ctx.repos, p.get("q") ?? "", p.get("city") || DEFAULT_CITY) };
});
