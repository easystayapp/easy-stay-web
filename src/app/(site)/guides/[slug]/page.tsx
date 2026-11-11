import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { GUIDES, guideBySlug } from "@/content/guides";
import { formatRupees } from "@/lib/domain/format";
import { getRepositories } from "@/lib/server/repositories";
import { areaLanding } from "@/lib/server/services/landing";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/seo";

/** Static guides; the live numbers block refreshes every 10 minutes. */
export const revalidate = 600;
export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/guides/${g.slug}`, modifiedTime: g.updated },
  };
}

/** Live listing counts and rents for the guide's areas, linked to their landing pages. */
async function LiveAreas({ city, areas }: { city: string; areas: string[] }) {
  let rows: { name: string; slug: string; count: number; from: number | null; typical: number | null }[] = [];
  try {
    const repos = await getRepositories();
    const found = await Promise.all(areas.map((a) => areaLanding(repos, city, a)));
    rows = found.filter((l) => l !== null).map((l) => ({ name: l.area!, slug: l.areaSlug!, count: l.stats.count, from: l.stats.minRent, typical: l.stats.medianRent }));
  } catch {
    return null;
  }
  if (!rows.length) return null;
  return (
    <section className="not-prose flex flex-col gap-3 rounded-2xl border border-line p-4 sm:p-5">
      <h2 className="text-lg font-extrabold text-ink">On EasyStay right now</h2>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.slug} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <Link href={`/pg/${city}/${r.slug}`} className="font-bold">PG in {r.name}</Link>
            <span className="text-muted-2">
              {r.count ? `${r.count} ${r.count === 1 ? "place" : "places"} · from ${formatRupees(r.from!)}${r.typical && r.typical !== r.from ? ` · typical ${formatRupees(r.typical)}` : ""}` : "No listings yet"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Live from current listings, per month.</p>
    </section>
  );
}

export default async function GuidePage({ params }: Params) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const updated = new Date(`${g.updated}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.description,
      dateModified: g.updated,
      datePublished: g.updated,
      mainEntityOfPage: absoluteUrl(`/guides/${g.slug}`),
      author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-mark.png") } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides") },
        { "@type": "ListItem", position: 3, name: g.title, item: absoluteUrl(`/guides/${g.slug}`) },
      ],
    },
  ];

  return (
    <article className="mx-auto flex max-w-[720px] flex-col gap-6 px-5 py-8 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <Link href="/">Home</Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <Link href="/guides">Guides</Link>
      </nav>
      <header className="flex flex-col gap-3">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight md:text-[40px]">{g.title}</h1>
        <p className="text-base leading-relaxed text-muted-2">{g.description}</p>
        <p className="text-xs font-semibold text-muted-foreground">
          Updated <time dateTime={g.updated}>{updated}</time> · {g.readMinutes} min read
        </p>
      </header>

      {g.liveCity && <LiveAreas city={g.liveCity.city} areas={g.liveCity.areas} />}

      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-muted-2">
        {g.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-2.5">
            <h2 className="mt-2 text-xl font-extrabold text-ink">{s.heading}</h2>
            {s.paragraphs?.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
            {s.bullets && (
              <ul className="list-disc space-y-1.5 pl-5">
                {s.bullets.map((b) => <li key={b.slice(0, 40)}>{b}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blush p-5">
        <span className="font-extrabold text-ink">Ready to look? Browse places and contact owners directly.</span>
        <Link href={g.liveCity ? `/pg/${g.liveCity.city}` : "/properties"} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-brand-dark hover:text-white">
          Find a stay
        </Link>
      </div>

      <aside aria-labelledby="more-guides" className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 id="more-guides" className="text-lg font-extrabold">More guides</h2>
        <ul className="flex flex-col gap-2">
          {others.map((o) => (
            <li key={o.slug}><Link href={`/guides/${o.slug}`} className="font-semibold">{o.title}</Link></li>
          ))}
        </ul>
      </aside>
    </article>
  );
}
