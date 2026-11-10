import { NextResponse } from "next/server";
import { route } from "@/lib/server/http";
import { getCatalog } from "@/lib/server/services/content";

/** Cities, default city, home sections, welcome cards and greetings (public, cached). */
export const GET = route(async (ctx) =>
  NextResponse.json(await getCatalog(ctx.repos), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
  }),
);
