import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/brand/logo-mark.png") },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: absoluteUrl("/"),
              potentialAction: { "@type": "SearchAction", target: absoluteUrl("/properties?q={search_term_string}"), "query-input": "required name=search_term_string" },
            },
          ]),
        }}
      />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
