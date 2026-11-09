import { dataBackend } from "@/lib/server/repositories";
import { memoryStore } from "@/lib/server/repositories/memory";

/** Serves photos for the in-memory backend. Cloud backends return their own URLs. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (dataBackend() !== "memory") return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  const file = memoryStore().files.get(path.map(decodeURIComponent).join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Blob([new Uint8Array(file.data)], { type: file.contentType }), {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
