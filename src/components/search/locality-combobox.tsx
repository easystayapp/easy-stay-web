"use client";

import { MapPin, TrendingUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/domain/search";

const MAX_OPTIONS = 7;

interface Option {
  /** Short area name put into the search box ("Gachibowli"). */
  area: string;
  /** Extra detail from the catalog name ("Telecom Nagar, Jayabheri Pine Valley"). */
  detail: string | null;
  popular: boolean;
}

/** "Gachibowli (Telecom Nagar, …)" → area "Gachibowli", detail "Telecom Nagar, …". */
function split(name: string): Pick<Option, "area" | "detail"> {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(name);
  return m ? { area: m[1], detail: m[2] } : { area: name, detail: null };
}

function optionsFor(localities: string[], popular: string[], query: string): Option[] {
  // Popular areas first; a catalog entry for the same area adds its detail.
  const byArea = new Map<string, Option>();
  for (const [name, isPopular] of [...popular.map((n) => [n, true] as const), ...localities.map((n) => [n, false] as const)]) {
    const o = { ...split(name), popular: isPopular };
    const key = o.area.toLowerCase();
    const existing = byArea.get(key);
    if (!existing) byArea.set(key, o);
    else if (!existing.detail && o.detail) existing.detail = o.detail;
  }
  const all = [...byArea.values()];
  const q = query.trim().toLowerCase();
  if (!q) return all.filter((o) => o.popular).slice(0, MAX_OPTIONS);

  const tokens = normalizeText(q);
  const rank = (o: Option) => {
    const text = `${o.area} ${o.detail ?? ""}`;
    if (o.area.toLowerCase().startsWith(q)) return 0;
    const words = normalizeText(text);
    return tokens.every((t) => words.some((w) => w.startsWith(t))) ? 1 : -1;
  };
  return all
    .map((o) => ({ o, r: rank(o) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || Number(b.o.popular) - Number(a.o.popular))
    .slice(0, MAX_OPTIONS)
    .map((x) => x.o);
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
  className,
  inputClassName,
}: {
  id: string;
  city: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const { cities } = useCatalog();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const current = cities.find((c) => c.label === city);
  const options = useMemo(
    () => optionsFor(current?.localities ?? [], current?.popular ?? [], value),
    [current, value],
  );
  const showList = open && options.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (o: Option) => {
    onChange(o.area);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={`Area in ${city}`}
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
          className="absolute top-[calc(100%+14px)] -left-3.5 z-50 flex w-[calc(100%+28px)] min-w-[260px] flex-col gap-0.5 rounded-2xl border border-border bg-white p-1.5 shadow-[var(--shadow-sheet)] animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {!value.trim() && (
            <li role="presentation" className="px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Popular in {city}
            </li>
          )}
          {options.map((o, i) => (
            <li
              key={o.area}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-sm text-ink",
                i === active && "bg-blush",
              )}
            >
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", i === active ? "bg-white text-brand" : "bg-surface text-muted-foreground")}>
                {o.popular ? <TrendingUp aria-hidden className="size-4" /> : <MapPin aria-hidden className="size-4" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">
                  <Highlight text={o.area} query={value} />
                </span>
                <span className="truncate text-xs text-muted-foreground">{o.detail ?? `${city}${o.popular ? " · Popular" : ""}`}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
