import type { ReactNode } from "react";

/** Simple long-form page (about, terms, privacy, help). */
export function ProsePage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-[720px] flex-col gap-6 px-5 py-10 md:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-[30px] font-extrabold tracking-tight md:text-[38px]">{title}</h1>
        {intro && <p className="text-base leading-relaxed text-muted-foreground">{intro}</p>}
      </header>
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-muted-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
