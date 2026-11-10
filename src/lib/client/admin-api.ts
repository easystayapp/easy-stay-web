"use client";

import { firebaseAuth } from "./firebase";

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Authenticated fetch for /api/admin/* (same origin as the console). */
export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new AdminApiError(401, "Signed out.");
  const res = await fetch(`/api/admin${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AdminApiError(res.status, data?.error?.message ?? "Request failed.");
  return data as T;
}

export const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60_000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
export const until = (ms: number) => {
  const h = Math.round((ms - Date.now()) / 3_600_000);
  return h < 0 ? `${-h}h overdue` : h < 48 ? `${h}h left` : `${Math.round(h / 24)}d left`;
};
