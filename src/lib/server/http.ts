import { NextResponse } from "next/server";
import { DomainError, HTTP_STATUS } from "@/lib/domain/errors";
import { verifyBearer, type AuthUser } from "./auth";
import { getRepositories, type Repositories } from "./repositories";
import { ensureUser } from "./services/users";

export interface RequestContext {
  req: Request;
  repos: Repositories;
  /** Verified caller, or null for anonymous requests. */
  auth: AuthUser | null;
}

type Handler<P> = (ctx: RequestContext, params: P) => Promise<unknown>;

/**
 * Wraps a route handler: resolves repositories and the caller, serialises
 * the result as JSON and maps DomainErrors to HTTP responses.
 */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const repos = await getRepositories();
      const auth = await verifyBearer(req.headers.get("authorization"));
      if (auth) await ensureUser(repos, auth);
      const result = await handler({ req, repos, auth }, await ctx.params);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof DomainError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message, details: err.details ?? null } },
          { status: HTTP_STATUS[err.code] },
        );
      }
      console.error(err);
      return NextResponse.json(
        { error: { code: "internal", message: "Something went wrong. Please try again.", details: null } },
        { status: 500 },
      );
    }
  };
}

export function requireAuth(ctx: RequestContext): AuthUser {
  if (!ctx.auth) throw new DomainError("unauthenticated", "Please log in to continue.");
  return ctx.auth;
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new DomainError("invalid_input", "Invalid request body.");
  }
}
