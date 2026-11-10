"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCity } from "@/hooks/use-city";
import { LocalityCombobox } from "@/components/search/locality-combobox";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/domain/types";

/** Search box for the results page: keeps every other filter, and type shortcuts set the property type. */
export function ListingSearch() {
  return (
    <Suspense fallback={<div className="h-12 rounded-2xl bg-surface" />}>
      <ListingSearchInner />
    </Suspense>
  );
}

function ListingSearchInner() {
  const params = useSearchParams();
  // Re-mount when the URL's search text changes so the box always shows the current search.
  return <ListingSearchForm key={params.get("q") ?? ""} params={params} />;
}

function ListingSearchForm({ params }: { params: URLSearchParams }) {
  const router = useRouter();
  const { city: savedCity } = useCity();
  const city = params.get("city") || savedCity;
  const [q, setQ] = useState(params.get("q") ?? "");
  // Shortcuts follow the current selection: already-filtered types come first.
  const selected = (params.get("type") ?? "").split(",").filter((t): t is PropertyType => PROPERTY_TYPES.includes(t as PropertyType));
  const shortcuts = [...selected, ...PROPERTY_TYPES.filter((t) => !selected.includes(t))];

  /** Keeps every other filter; a type shortcut also sets the property type. */
  const go = (text: string, type: PropertyType | null) => {
    const next = new URLSearchParams(params);
    if (text.trim()) next.set("q", text.trim());
    else next.delete("q");
    if (type) {
      next.set("type", type);
      next.delete("sharing"); // sizes belong to the previous type
    }
    if (!next.get("city")) next.set("city", city);
    next.delete("page");
    router.push(`/properties?${next}`);
  };

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        go(q, null);
      }}
    >
      <InputGroup className="h-12 rounded-2xl border-line bg-white shadow-[var(--shadow-card)]">
        <InputGroupAddon>
          <Search aria-hidden className="size-[18px] text-brand" />
        </InputGroupAddon>
        <LocalityCombobox
          id="listing-q"
          onListing={(href) => router.push(href)}
          city={city}
          value={q}
          onChange={setQ}
          onSelect={(sel) => go(sel.q, sel.type)}
          typeShortcuts={shortcuts}
          ariaLabel={`Search area, PG, room or flat in ${city}`}
          placeholder={`Search area, PG, room or flat in ${city}`}
          inputSlot="input-group-control"
          className="static flex h-full min-w-0 flex-1 items-center"
          inputClassName="h-full truncate pr-3 pl-1.5 text-sm"
          listClassName="top-[calc(100%+8px)] left-0 w-full"
        />
      </InputGroup>
    </form>
  );
}
