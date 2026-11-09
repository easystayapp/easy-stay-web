"use client";

import { Building2, ChevronLeft, Clock, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCity } from "@/hooks/use-city";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Chip } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { addRecentSearch, clearRecentSearches, recentSearches, type RecentSearch } from "@/lib/client/prefs";
import { PROPERTY_TYPE_LABEL } from "@/lib/domain/catalog";
import type { Suggestion } from "@/types/api";
import { emptyFilters, normalizeText, serializeFilters } from "@/lib/domain/search";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/domain/types";

/** Highlights the typed prefix inside a suggestion label. */
function Highlight({ text, q }: { text: string; q: string }) {
  const token = normalizeText(q)[0];
  const i = token ? text.toLowerCase().indexOf(token) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-brand">{text.slice(i, i + token.length)}</span>
      {text.slice(i + token.length)}
    </>
  );
}

/** 03 · Search — suggestions, recent searches, search by type. */
function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const { city } = useCity();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read device-local history after mount
    setRecent(recentSearches());
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to suggest
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .suggestions(q, city)
        .then((r) => !cancelled && setSuggestions(r.items))
        .catch(() => {});
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, city]);

  const go = (label: string, query: { q: string; type?: PropertyType }) => {
    const qs = serializeFilters({ ...emptyFilters(city), q: query.q, types: query.type ? [query.type] : [] }).toString();
    addRecentSearch({ label, query: qs });
    router.push(`/properties?${qs}`);
  };

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-7 px-4 py-5 sm:px-6 md:py-10">
      <form
        role="search"
        className="flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(q.trim(), { q: q.trim() });
        }}
      >
        <Link href="/" aria-label="Back" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-line text-ink">
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <InputGroup className="flex-1 border-brand">
          <InputGroupAddon>
            <Search aria-hidden className="size-[18px] text-brand" />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search area, PG, room or flat"
            placeholder="Search area, PG, room or flat"
            enterKeyHint="search"
            className="font-bold"
          />
        </InputGroup>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="eyebrow mb-2">Suggestions</span>
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => go(s.label, s.query)}
              className="flex items-center gap-3.5 rounded-[14px] px-2 py-2.5 text-left hover:bg-surface"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush text-brand">
                {s.kind === "locality" ? <MapPin aria-hidden className="size-[18px]" /> : <Building2 aria-hidden className="size-[18px]" />}
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-bold">
                  <Highlight text={s.label} q={q} />
                </span>
                <span className="text-xs text-muted-foreground">{s.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Recent searches</span>
            <button
              type="button"
              className="text-[13px] font-bold text-brand"
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
            >
              Clear
            </button>
          </div>
          {recent.map((r) => (
            <Link key={r.query} href={`/properties?${r.query}`} className="flex items-center gap-3 py-2 text-sm font-semibold text-ink hover:text-brand">
              <Clock aria-hidden className="size-[18px] text-muted-foreground" />
              {r.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="eyebrow">Search by type</span>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <Chip key={t} onClick={() => go(`${PROPERTY_TYPE_LABEL[t]} in ${city}`, { q: "", type: t })}>
              {PROPERTY_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
