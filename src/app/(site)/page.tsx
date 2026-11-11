import { getRepositories } from "@/lib/server/repositories";
import { getCatalog } from "@/lib/server/services/content";
import { jsonLd } from "@/lib/seo";
import { HomeView } from "./home-view";

/** Home: the interactive page plus FAQ structured data for search engines. */
export default async function HomePage() {
  let faqs: { question: string; answer: string }[] = [];
  try {
    faqs = (await getCatalog(await getRepositories())).home.faqs;
  } catch {
    // Content unavailable: render the page without the structured data.
  }
  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
            }),
          }}
        />
      )}
      <HomeView />
    </>
  );
}
