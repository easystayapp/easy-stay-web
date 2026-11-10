import { NextResponse } from "next/server";
import { requireAuth, route } from "@/lib/server/http";
import { exportMyData } from "@/lib/server/services/ops/privacy";

/** Downloads everything held about the caller as JSON. */
export const GET = route(async (ctx) => {
  const data = await exportMyData(ctx.repos, requireAuth(ctx));
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="easystay-my-data.json"', "cache-control": "no-store" },
  });
});
