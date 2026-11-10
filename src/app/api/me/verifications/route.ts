import { readJson, requireAuth, route } from "@/lib/server/http";
import { myVerifications, submitVerification } from "@/lib/server/services/ops/verification";

export const GET = route(async (ctx) => myVerifications(ctx.repos, requireAuth(ctx)));

/** Body: { kind, subjectId?, files: string[], documentType?, expiresAt? } */
export const POST = route(async (ctx) => submitVerification(ctx.repos, requireAuth(ctx), await readJson(ctx.req)));
