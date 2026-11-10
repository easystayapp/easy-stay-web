/** Served at admin.<domain>/robots.txt (via the proxy rewrite): keep the console out of search. */
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
}
