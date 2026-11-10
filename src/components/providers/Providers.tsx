"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { storeCity, storedCity } from "@/lib/client/prefs";
import type { Catalog } from "@/lib/domain/content";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AuthProvider } from "./auth-provider";
import { CatalogProvider } from "./catalog-provider";
import { ToastProvider } from "./toast-provider";

/* ----------------------------------------------------------------- city */

export const CityContext = createContext<{ city: string; setCity: (c: string) => void }>({
  city: "",
  setCity: () => {},
});

function CityProvider({ children }: { children: React.ReactNode }) {
  const { cities, defaultCity } = useCatalog();
  const [city, setCityState] = useState(defaultCity);
  useEffect(() => {
    const stored = storedCity();
    // Ignore a remembered city that is no longer offered.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    if (stored && cities.some((c) => c.label === stored)) setCityState(stored);
  }, [cities]);
  const setCity = useCallback((c: string) => {
    setCityState(c);
    storeCity(c);
  }, []);
  return <CityContext.Provider value={{ city, setCity }}>{children}</CityContext.Provider>;
}

/* ---------------------------------------------------------------- saved */

export interface SavedContextValue {
  isSaved: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
}

export const SavedContext = createContext<SavedContextValue>({ isSaved: () => false, toggle: async () => {} });

function SavedProvider({ children }: { children: React.ReactNode }) {
  const { user, requireLogin, refreshMe } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on sign-out
      setIds(new Set());
      return;
    }
    let cancelled = false;
    api
      .savedIds()
      .then((r) => !cancelled && setIds(new Set(r.ids)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    async (id: string) => {
      const ok = await requireLogin({
        title: "Log in to save properties",
        subtitle: "Your saved places stay in one spot, on every device.",
      });
      if (!ok) return;
      const was = ids.has(id);
      setIds((s) => {
        const n = new Set(s);
        if (was) n.delete(id);
        else n.add(id);
        return n;
      });
      try {
        if (was) await api.unsave(id);
        else await api.save(id);
        toast(was ? "Removed from saved" : "Saved to your list");
        void refreshMe();
      } catch (e) {
        setIds((s) => {
          const n = new Set(s);
          if (was) n.add(id);
          else n.delete(id);
          return n;
        });
        toast(errorMessage(e), "error");
      }
    },
    [ids, requireLogin, refreshMe, toast],
  );

  const value = useMemo(() => ({ isSaved: (id: string) => ids.has(id), toggle }), [ids, toggle]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function Providers({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return (
    <CatalogProvider value={catalog}>
      <ToastProvider>
        <AuthProvider>
          <CityProvider>
            <SavedProvider>{children}</SavedProvider>
          </CityProvider>
        </AuthProvider>
      </ToastProvider>
    </CatalogProvider>
  );
}
