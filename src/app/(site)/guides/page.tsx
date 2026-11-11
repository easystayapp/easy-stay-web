import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/content/guides";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Guides for renting a PG, hostel, room or flat",
  description: "Practical guides for finding a PG, hostel, room or flat in India: safety checks, questions to ask owners, choosing an area and what to compare.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <div className="container-page flex flex-col gap-8 py-8 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${SITE_NAME} guides`,
            url: absoluteUrl("/guides"),
            hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: absoluteUrl(`/guides/${g.slug}`) })),
          }),
        }}
      />
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-[30px] font-extrabold tracking-tight md:text-[40px]">Renting guides</h1>
        <p className="text-base leading-relaxed text-muted-2">Straight answers for finding a safe, fairly priced place to stay, written for people moving for work or study.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="lift flex h-full flex-col gap-2 rounded-[22px] border-[1.5px] border-line bg-white p-5 text-ink hover:border-blush-line hover:text-ink hover:shadow-[var(--shadow-card)]">
              <span className="text-lg leading-snug font-extrabold">{g.title}</span>
              <span className="text-sm leading-relaxed text-muted-2">{g.description}</span>
              <span className="mt-auto pt-1 text-xs font-semibold text-muted-foreground">{g.readMinutes} min read</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
