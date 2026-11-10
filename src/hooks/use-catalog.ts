"use client";

import { useContext } from "react";
import { CatalogContext } from "@/components/providers/catalog-provider";

/** Cities, default city, home sections, welcome cards and greetings from the database. */
export const useCatalog = () => useContext(CatalogContext);
