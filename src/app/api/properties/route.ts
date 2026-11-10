import { parseFilters } from "@/lib/domain/search";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { defaultCity } from "@/lib/server/services/content";
import { createProperty, searchProperties } from "@/lib/server/services/properties";

/** Public search. Query params follow `serializeFilters`. */
export const GET = route(async (ctx) =>
  searchProperties(ctx.repos, parseFilters(new URL(ctx.req.url).searchParams, await defaultCity(ctx.repos))),
);

/** Body: { input: PropertyInput, publish: boolean } */
export const POST = route(async (ctx) => {
  const body = await readJson<{ input?: unknown; publish?: boolean }>(ctx.req);
  return createProperty(ctx.repos, requireAuth(ctx), body.input, body.publish === true);
});
