import type { ProfileUpdate } from "@/types/api";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { getMe, updateProfile } from "@/lib/server/services/users";

export const GET = route(async (ctx) => getMe(ctx.repos, requireAuth(ctx)));

export const PATCH = route(async (ctx) =>
  updateProfile(ctx.repos, requireAuth(ctx), await readJson<ProfileUpdate>(ctx.req)),
);
