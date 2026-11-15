"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { api } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { emptyFilters } from "@/lib/domain/search";
import type { PropertyCard as Card, PropertyDetail } from "@/types/api";

/* ------------------------------------------------------------ headings */

/** Small caps eyebrow above a section title, like the reference's "AMENITIES / What this place offers". */
export function SectionHeading({ eyebrow, title, id, className }: { eyebrow: string; title: string; id?: string; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-extrabold tracking-[0.14em] text-brand uppercase">{eyebrow}</span>
      <h2 id={id} className="text-[22px] leading-tight font-extrabold tracking-tight md:text-[26px]">{title}</h2>
    </div>
  );
}

/** Anchor target that sits below the sticky header + tab bar. */
export function Section({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx("flex scroll-mt-36 flex-col gap-5", className)}>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ tab bar */

export interface Tab {
  id: string;
  label: string;
}

/**
 * Sticky section tabs with scroll-spy: the underline follows what you're reading,
 * and a tap jumps to the section. Sits just under the site header.
 */
export function SectionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [top, setTop] = useState(72);
  const lock = useRef<number | null>(null);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => setTop(Math.round(header.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    // Sections currently inside the active band. Callbacks only report what changed,
    // so the full set is tracked here and the lowest one in page order wins.
    const inBand = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        if (lock.current) return; // a tap is scrolling; don't fight it
        const current = [...tabs].reverse().find((t) => inBand.has(t.id));
        if (current) setActive(current.id);
      },
      // Active band: from just under the sticky bars to 60% down the viewport.
      { rootMargin: `-${top + 56}px 0px -60% 0px` },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [tabs, top]);

  const go = (id: string) => {
    setActive(id);
    if (lock.current) window.clearTimeout(lock.current);
    lock.current = window.setTimeout(() => (lock.current = null), 700);
  };

  return (
    <nav
      aria-label="Sections"
      style={{ top }}
      className="sticky z-30 -mx-4 border-b border-line bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-t-none lg:px-0"
    >
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => (
          <li key={t.id} className="shrink-0">
            <a
              href={`#${t.id}`}
              onClick={() => go(t.id)}
              aria-current={active === t.id ? "true" : undefined}
              className={cx(
                "relative flex h-12 items-center px-3.5 text-sm font-semibold transition-colors",
                active === t.id ? "font-extrabold text-brand" : "text-muted-2 hover:text-ink",
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cx("absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand transition-opacity", active === t.id ? "opacity-100" : "opacity-0")}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------- about */

/** Description in an accent-edged card, clamped to a few lines with Read more. */
export function AboutCard({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  const check = useCallback(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight - el.clientHeight > 2);
  }, []);
  useEffect(() => {
    if (open) return;
    // Measuring the rendered text is the only reliable way to know if it was cut off.
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [open, text, check]);

  return (
    <div className="rounded-[20px] border border-line border-l-[4px] border-l-brand bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
      <p ref={ref} className={cx("text-[15px] leading-relaxed whitespace-pre-line text-muted-2", !open && "line-clamp-6")}>
        {text}
      </p>
      {(clamped || open) && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:text-brand-dark">
          {open ? "Show less" : "Read more"}
          <ChevronDown aria-hidden className={cx("size-4 transition-transform", open && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------- amenities */

export interface Offer {
  icon: ReactNode;
  label: string;
}

/** Amenity cards with a tinted icon circle; collapses past a few rows. */
export function OfferGrid({ offers, initial = 6 }: { offers: Offer[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? offers : offers.slice(0, initial);
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((o) => (
          <li key={o.label} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-[var(--shadow-card)]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blush text-brand [&_svg]:size-[18px]">{o.icon}</span>
            <span className="text-sm font-semibold">{o.label}</span>
          </li>
        ))}
      </ul>
      {offers.length > initial && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          className="inline-flex h-11 items-center gap-1.5 self-start rounded-xl border-[1.5px] border-line px-4 text-sm font-bold hover:border-input"
        >
          {all ? "Show fewer" : `Show all ${offers.length} amenities`}
          <ChevronDown aria-hidden className={cx("size-4 transition-transform", all && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------- info tiles */

/** "CHECK-IN AFTER 13:00"-style tile: icon, small caps label, value. */
export function InfoTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blush text-brand [&_svg]:size-5">{icon}</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{label}</span>
        <span className="truncate text-[17px] font-extrabold">{value}</span>
        {hint && <span className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------- share */

/** Share via the system sheet when there is one, otherwise copy the link. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className={cx("inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-line bg-white px-4 text-[13px] font-bold hover:border-input", className)}
    >
      {copied ? <Check aria-hidden className="size-4 text-ok" /> : <Share2 aria-hidden className="size-4" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

/* ------------------------------------------------------ more stays */

/** "More stays in {locality}": similar live listings in a snap-scrolling row with arrows. */
export function SimilarStays({ p }: { p: Pick<PropertyDetail, "id" | "city" | "locality" | "type"> }) {
  const [items, setItems] = useState<Card[] | null>(null);
  const [area, setArea] = useState(p.locality);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const here = await api.search({ ...emptyFilters(p.city), q: p.locality });
        let list = here.items.filter((x) => x.id !== p.id);
        let label = p.locality;
        if (list.length < 3) {
          // Too few in this locality: widen to the whole city.
          const wide = await api.search(emptyFilters(p.city));
          list = [...list, ...wide.items.filter((x) => x.id !== p.id && !list.some((l) => l.id === x.id))];
          label = p.city;
        }
        if (!cancelled) {
          setItems(list.slice(0, 10));
          setArea(label);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [p.id, p.city, p.locality]);

  if (items && items.length === 0) return null;
  const scroll = (d: number) => row.current?.scrollBy({ left: d * (row.current.clientWidth * 0.8), behavior: "smooth" });

  return (
    <section aria-labelledby="similar-title" className="flex flex-col gap-5 pt-4">
      <div className="flex items-end justify-between gap-3">
        <SectionHeading eyebrow="Keep exploring" title={`More stays in ${area}`} id="similar-title" />
        <div className={cx("hidden gap-2", (items?.length ?? 0) > 3 && "lg:flex")}>
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-line bg-white hover:border-input">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-line bg-white hover:border-input">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      <div ref={row} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {(items ?? Array.from({ length: 4 })).map((c, i) => (
          <div key={c ? (c as Card).id : i} className="w-[270px] shrink-0 snap-start">
            {c ? <PropertyCard p={c as Card} /> : <div aria-hidden className="h-[340px] animate-pulse rounded-[20px] bg-line-3 motion-reduce:animate-none" />}
          </div>
        ))}
      </div>
    </section>
  );
}
