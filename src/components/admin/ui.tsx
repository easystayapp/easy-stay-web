"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/client/admin-api";

export const Panel = ({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="mb-4 rounded-2xl border bg-white p-4">
    {(title || right) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">{title}</h2>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const H1 = ({ children }: { children: React.ReactNode }) => <h1 className="mb-4 text-2xl font-extrabold">{children}</h1>;

export const Pill = ({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "red" | "green" | "amber" }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
      { gray: "bg-muted text-foreground", red: "bg-red-100 text-red-700", green: "bg-green-100 text-green-700", amber: "bg-amber-100 text-amber-800" }[tone]
    }`}
  >
    {children}
  </span>
);

export const field = "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

/** Loads GET /api/admin<path> and exposes reload + error. */
export function useAdminGet<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await adminFetch<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return { data, error, loading, reload: load };
}

/** Runs a mutation with busy + error state. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, okMsg = "Done.") => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDone(okMsg);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, done, run };
}

export const Note = ({ error, done }: { error?: string | null; done?: string | null }) =>
  error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : done ? <p className="mt-2 text-sm font-semibold text-green-700">{done}</p> : null;
