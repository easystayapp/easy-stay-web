"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { currentPosition, geolocationPermission } from "@/lib/client/geo";
import { cityIsAuto, geoAsked, markGeoAsked, storeCity, storedCity } from "@/lib/client/prefs";
import { nearestCity } from "@/lib/domain/city-geo";
import type { Catalog } from "@/lib/domain/content";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AuthProvider } from "./auth-provider";
import { CatalogProvider } from "./catalog-provider";
import { ToastProvider } from "./toast-provider";

/* ----------------------------------------------------------------- city */

export interface CityContextValue {
  city: string;
  /** The visitor's own choice. Remembered, and never overridden by location afterwards. */
  setCity: (c: string) => void;
  /** True while the current city was picked from the visitor's location rather than by them. */
  detected: boolean;
  /**
   * Picks the nearest city from the visitor's location. Does nothing once they have chosen a city
   * themselves, and asks for location permission at most once.
   */
  detectCity: () => Promise<void>;
}

export const CityContext = createContext<CityContextValue>({
  city: "",
  setCity: () => {},
  detected: false,
  detectCity: async () => {},
});

function CityProvider({ children }: { children: React.ReactNode }) {
  const { cities, defaultCity } = useCatalog();
  const [city, setCityState] = useState(defaultCity);
  const [detected, setDetected] = useState(false);
  /** The visitor has picked a city themselves (now or on an earlier visit). */
  const manual = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
  useEffect(() => {
    const stored = storedCity();
    // Ignore a remembered city that is no longer offered.
    if (stored && cities.some((c) => c.label === stored)) {
      setCityState(stored);
      setDetected(cityIsAuto());
      manual.current = !cityIsAuto();
    }
  }, [cities]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setCity = useCallback((c: string) => {
    manual.current = true;
    setCityState(c);
    setDetected(false);
    storeCity(c, false);
  }, []);

  /**
   * Whether the visitor has picked a city themselves. Reads storage, not just the ref: children's effects
   * (the home page asks for detection) run before this provider has hydrated from storage.
   */
  const chosenByVisitor = useCallback(() => manual.current || (!!storedCity() && !cityIsAuto()), []);

  const detectCity = useCallback((): Promise<void> => {
    if (chosenByVisitor()) return Promise.resolve();
    inflight.current ??= (async () => {
      const permission = await geolocationPermission();
      if (permission === "denied" || chosenByVisitor()) return;
      // Without standing permission, ask only once ever: a refusal must not turn into nagging.
      if (permission !== "granted" && geoAsked()) return;
      markGeoAsked();
      let hit: ReturnType<typeof nearestCity> = null;
      try {
        hit = nearestCity(await currentPosition(), cities);
      } catch {
        return; // refused or unavailable: keep the default
      }
      if (!hit || chosenByVisitor()) return; // outside our cities, or they chose while we were asking
      setCityState(hit.city);
      setDetected(true);
      storeCity(hit.city, true);
    })().finally(() => {
      inflight.current = null;
    });
    return inflight.current;
  }, [cities, chosenByVisitor]);

  const value = useMemo(() => ({ city, setCity, detected, detectCity }), [city, setCity, detected, detectCity]);
  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
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
