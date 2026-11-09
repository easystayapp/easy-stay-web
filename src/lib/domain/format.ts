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
