import { startOfDayIST } from "./time";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatRupees = (n: number) => `₹${inr.format(n)}`;

/** ₹5k / ₹12.5k style, for chips. */
export function formatRupeesShort(n: number): string {
  if (n >= 1000) return `₹${Number((n / 1000).toFixed(1))}k`;
  return `₹${n}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/** "Available now" or "From 15 Nov". */
export function availabilityLabel(availableFrom: Date | null, now = new Date()): string {
  if (!availableFrom || availableFrom.getTime() < startOfDayIST(now).getTime() + 86_400_000) return "Available now";
  return `From ${formatDayMonth(availableFrom)}`;
}

/** "Updated today", "Updated yesterday", "Updated 4 days ago", "Updated 2 months ago" (IST days). */
export function freshnessLabel(at: Date, now = new Date()): string {
  const days = Math.max(0, Math.round((startOfDayIST(now).getTime() - startOfDayIST(at).getTime()) / 86_400_000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months > 1 ? "s" : ""} ago`;
}

/** Listings untouched this long get a muted label so seekers know to confirm. */
export const STALE_DAYS = 10;
export const isStale = (at: Date, now = new Date()) => now.getTime() - at.getTime() > STALE_DAYS * 86_400_000;

/* -------------------------------------------------------------- phones */

/** Accepts 10-digit Indian mobiles in common formats; returns E.164 or null. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** +919876543210 → +91 98765 43210 */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Member";
}

export function initial(name: string): string {
  return (name.trim()[0] || "E").toUpperCase();
}

/** "Sat, 16 Nov · 10:00 AM" in IST. */
export function formatVisit(ms: number): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return `${day} · ${time}`;
}
