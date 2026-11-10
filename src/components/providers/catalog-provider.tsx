"use client";

import { createContext } from "react";
import type { Catalog } from "@/lib/domain/content";

export const EMPTY_CATALOG: Catalog = {
  cities: [],
  defaultCity: "",
  home: { budgets: [], categories: [], steps: [], highlights: [], faqs: [] },
  welcome: { roles: [] },
  greetings: { pg: "", room: "", flat: "" },
};

export const CatalogContext = createContext<Catalog>(EMPTY_CATALOG);

/** Database-backed reference data and content, loaded by the root layout on the server. */
export function CatalogProvider({ value, children }: { value: Catalog; children: React.ReactNode }) {
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
