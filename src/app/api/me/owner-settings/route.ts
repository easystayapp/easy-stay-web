import type { OwnerSettingsUpdate } from "@/types/api";
import { readJson, requireAuth, route } from "@/lib/server/http";
import { updateOwnerSettings } from "@/lib/server/services/users";

export const PATCH = route(async (ctx) =>
  updateOwnerSettings(ctx.repos, requireAuth(ctx), await readJson<OwnerSettingsUpdate>(ctx.req)),
);
