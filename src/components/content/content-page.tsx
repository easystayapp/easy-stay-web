import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import type { Page } from "@/lib/domain/content";
import { getRepositories } from "@/lib/server/repositories";
import { getPage } from "@/lib/server/services/content";
import { ProsePage } from "./prose-page";

async function load(slug: string): Promise<Page | null> {
  try {
    return await getPage(await getRepositories(), slug);
  } catch (err) {
    console.error(`[easystay] Could not load page "${slug}"`, err);
    return null;
  }
}

/** `**bold**` → <b>bold</b>; everything else is plain text. */
function rich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

export async function contentMetadata(slug: string): Promise<Metadata> {
  const page = await load(slug);
  return {
    title: page?.title ?? "EasyStay",
    description: page?.intro ?? undefined,
    alternates: { canonical: `/${slug}` },
  };
}

/** A help/about/terms/privacy page whose text lives in the database (`pages/{slug}`). */
export async function ContentPage({ slug }: { slug: string }) {
  const page = await load(slug);
  if (!page) notFound();
  return (
    <ProsePage title={page.title} intro={page.intro ?? undefined}>
      {page.sections.map((s, i) => (
        <Fragment key={s.anchor ?? s.heading ?? i}>
          {s.heading && <h2 id={s.anchor ?? undefined}>{rich(s.heading)}</h2>}
          {s.paragraphs.map((p, j) => (
            <p key={j}>{rich(p)}</p>
          ))}
          {s.items.length > 0 && (
            <ul>
              {s.items.map((item, j) => (
                <li key={j}>{rich(item)}</li>
              ))}
            </ul>
          )}
        </Fragment>
      ))}
    </ProsePage>
  );
}
