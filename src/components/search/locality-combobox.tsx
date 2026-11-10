"use client";

import { BedDouble, Building2, House, MapPin, TrendingUp } from "lucide-react";
import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/domain/search";
import type { PropertyType } from "@/lib/domain/types";

const MAX_AREAS = 7;

interface AreaOption {
  kind: "area";
  /** Short area name put into the search box ("Gachibowli"). */
  area: string;
  /** Extra detail from the catalog name ("Telecom Nagar, Jayabheri Pine Valley"). */
  detail: string | null;
  popular: boolean;
}

/** "PGs in Gachibowli": the area plus a property-type filter. */
interface TypeOption {
  kind: "type";
  /** "" = the whole city (default shortcuts before anything is typed). */
  area: string;
  type: PropertyType;
}

/** A listing whose name matches what was typed ("Sunrise PG"). */
interface ListingOption {
  kind: "listing";
  label: string;
  sub: string;
  href: string;
  imageUrl: string | null;
}

type Option = AreaOption | TypeOption | ListingOption;

/** What the user picked: the search text and, for a shortcut, a property type. */
export interface LocalitySelection {
  q: string;
  type: PropertyType | null;
}

const TYPE_NOUN: Record<PropertyType, string> = { pg: "PGs", room: "Rooms", flat: "Flats" };
const TYPE_ICON = { pg: Building2, room: BedDouble, flat: House } as const;

/** "Gachibowli (Telecom Nagar, …)" → area "Gachibowli", detail "Telecom Nagar, …". */
function split(name: string): Pick<AreaOption, "area" | "detail"> {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(name);
  return m ? { area: m[1], detail: m[2] } : { area: name, detail: null };
}

function areasFor(localities: string[], popular: string[], query: string, max: number): AreaOption[] {
  // Popular areas first; a catalog entry for the same area adds its detail.
  const byArea = new Map<string, AreaOption>();
  for (const [name, isPopular] of [...popular.map((n) => [n, true] as const), ...localities.map((n) => [n, false] as const)]) {
    const o: AreaOption = { kind: "area", ...split(name), popular: isPopular };
    const key = o.area.toLowerCase();
    const existing = byArea.get(key);
    if (!existing) byArea.set(key, o);
    else if (!existing.detail && o.detail) existing.detail = o.detail;
  }
  const all = [...byArea.values()];
  const q = query.trim().toLowerCase();
  if (!q) return all.filter((o) => o.popular).slice(0, max);

  const tokens = normalizeText(q);
  const rank = (o: AreaOption) => {
    const text = `${o.area} ${o.detail ?? ""}`;
    if (o.area.toLowerCase().startsWith(q)) return 0;
    const words = normalizeText(text);
    return tokens.every((t) => words.some((w) => w.startsWith(t))) ? 1 : -1;
  };
  return all
    .map((o) => ({ o, r: rank(o) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || Number(b.o.popular) - Number(a.o.popular))
    .slice(0, max)
    .map((x) => x.o);
}

/**
 * Areas, then "PGs / Rooms / Flats in <best area>" shortcuts. Types already
 * selected in the current search come first.
 */
function optionsFor(localities: string[], popular: string[], query: string, shortcuts: PropertyType[] | null): Option[] {
  if (!shortcuts) return areasFor(localities, popular, query, MAX_AREAS);
  if (!query.trim()) {
    // Defaults before typing: popular areas, then every type across the city.
    const areas = areasFor(localities, popular, "", 5);
    return [...areas, ...shortcuts.map<TypeOption>((type) => ({ kind: "type", area: "", type }))];
  }
  const areas = areasFor(localities, popular, query, 4);
  const top = areas[0];
  return top ? [...areas, ...shortcuts.map<TypeOption>((type) => ({ kind: "type", area: top.area, type }))] : areas;
}

/** Bolds the part of `text` that starts with the typed query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-extrabold text-brand-dark">{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Location field with area autocomplete for the selected city. Areas come from
 * the city's catalog in the database (`cities/{id}.localities` + `popular`).
 * Enter on a highlighted option picks it; otherwise Enter submits the form.
 */
export function LocalityCombobox({
  id,
  city,
  value,
  onChange,
  onSelect,
  typeShortcuts,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
  listClassName,
  inputSlot,
  onListing,
}: {
  id: string;
  city: string;
  value: string;
  onChange: (value: string) => void;
  /** Called after a pick (the box already holds the area). Use it to search right away. */
  onSelect?: (selection: LocalitySelection) => void;
  /** Offer "PGs / Rooms / Flats in <area>" shortcuts, in this order. */
  typeShortcuts?: PropertyType[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  /** Positions the dropdown relative to the field's container. */
  listClassName?: string;
  /** `data-slot` for the input, e.g. "input-group-control" inside an InputGroup. */
  inputSlot?: string;
  /** Also suggest listings by name; called with the listing's URL when one is picked. */
  onListing?: (href: string) => void;
}) {
  const { cities } = useCatalog();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const current = cities.find((c) => c.label === city);
  const query = value.trim();

  // Listings by name come from the server (debounced); kept per query so stale results never show.
  const listingsOn = !!onListing;
  const [found, setFound] = useState<{ key: string; items: ListingOption[] }>({ key: "", items: [] });
  useEffect(() => {
    if (!listingsOn || query.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .suggestions(query, city)
        .then((r) => {
          if (cancelled) return;
          const items = r.items
            .filter((x) => x.kind === "property" && x.href)
            .map<ListingOption>((x) => ({ kind: "listing", label: x.label, sub: x.sub, href: x.href!, imageUrl: x.imageUrl ?? null }));
          setFound({ key: `${city}|${query}`, items });
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [listingsOn, query, city]);
  const listings = useMemo(
    () => (listingsOn && query.length >= 2 && found.key === `${city}|${query}` ? found.items : []),
    [listingsOn, query, city, found],
  );

  const options = useMemo<Option[]>(() => {
    const base = optionsFor(current?.localities ?? [], current?.popular ?? [], value, typeShortcuts ?? null);
    if (!listings.length) return base;
    // Areas, then matching listings, then type shortcuts.
    const areas = base.filter((o) => o.kind === "area");
    return [...areas, ...listings, ...base.filter((o) => o.kind !== "area")];
  }, [current, value, typeShortcuts, listings]);
  const showList = open && options.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (o: Option) => {
    setOpen(false);
    setActive(-1);
    if (o.kind === "listing") {
      onChange(o.label);
      onListing?.(o.href);
      return;
    }
    onChange(o.area);
    onSelect?.({ q: o.area, type: o.kind === "type" ? o.type : null });
  };

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        role="combobox"
        data-slot={inputSlot}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder ?? `Area in ${city}`}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (options.length ? (i + step + options.length) % options.length : -1));
          } else if (e.key === "Enter" && showList && active >= 0) {
            e.preventDefault(); // pick instead of submitting
            pick(options[active]);
          } else if (e.key === "Escape" && showList) {
            e.preventDefault();
            setOpen(false);
            setActive(-1);
          }
        }}
        className={cn("w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground", inputClassName)}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Areas in ${city}`}
          // Keep focus in the input while clicking an option.
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "absolute top-[calc(100%+14px)] -left-3.5 z-50 flex w-[calc(100%+28px)] min-w-[260px] flex-col gap-0.5 rounded-2xl border border-border bg-white p-1.5 shadow-[var(--shadow-sheet)] animate-in fade-in-0 zoom-in-95 duration-150",
            listClassName,
          )}
        >
          {options.map((o, i) => {
            const Icon = o.kind === "type" ? TYPE_ICON[o.type] : o.kind === "listing" ? Building2 : o.popular ? TrendingUp : MapPin;
            const prev = options[i - 1];
            const empty = !value.trim();
            // Section headings before typing; dividers between groups after.
            const heading =
              empty && !prev && o.kind === "area"
                ? `Popular in ${city}`
                : empty && o.kind === "type" && prev?.kind !== "type"
                  ? "Browse by type"
                  : o.kind === "listing" && prev?.kind !== "listing"
                    ? "Properties"
                    : null;
            const divider = !empty && o.kind === "type" && prev?.kind !== "type";
            const where = o.kind === "type" ? o.area || city : null;
            return (
              <Fragment key={o.kind === "type" ? `type-${o.type}` : o.kind === "listing" ? o.href : o.area}>
                {heading && (
                  <li
                    role="presentation"
                    className={cn("px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase", prev && "mt-1 border-t border-line pt-3")}
                  >
                    {heading}
                  </li>
                )}
                <li
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-ink",
                    i === active && "bg-blush",
                    divider && "mt-1 border-t border-line pt-3",
                  )}
                >
                  {o.kind === "listing" && o.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- listing photo from user uploads
                    <img src={o.imageUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", i === active ? "bg-white text-brand" : "bg-surface text-muted-foreground")}>
                      <Icon aria-hidden className="size-4" />
                    </span>
                  )}
                  {o.kind === "listing" ? (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">
                        <Highlight text={o.label} query={value} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{o.sub}</span>
                    </span>
                  ) : o.kind === "type" ? (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">
                        {TYPE_NOUN[o.type]} in <b className="font-extrabold">{where}</b>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{o.area ? `Property type · ${city}` : "All areas"}</span>
                    </span>
                  ) : (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">
                        <Highlight text={o.area} query={value} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{o.detail ?? `${city}${o.popular ? " · Popular" : ""}`}</span>
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
