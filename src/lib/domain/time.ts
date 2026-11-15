/** Date helpers. Calendar days are computed in India Standard Time. */

export const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Calendar day key (YYYY-MM-DD) in IST. */
export function dayKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The last `n` day keys ending today, oldest first. */
export function lastDayKeys(n: number, now: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(addDays(now, i - (n - 1))));
}

/** Day keys from `from` through `to`, inclusive, capped at `max`. */
export function dayKeysBetween(from: Date, to: Date, max = 60): string[] {
  const keys: string[] = [];
  const end = dayKey(to);
  for (let d = from, i = 0; i < max; d = addDays(d, 1), i++) {
    const k = dayKey(d);
    keys.push(k);
    if (k >= end) break;
  }
  return keys;
}

/** Start of the IST calendar day containing `date`, as an instant. */
export function startOfDayIST(date: Date): Date {
  return new Date(`${dayKey(date)}T00:00:00+05:30`);
}

/** Parses YYYY-MM-DD as the start of that IST day. */
export function parseDayKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The instant an IST wall-clock hour starts on a given day key. */
export function istHour(key: string, hour: number): number {
  return new Date(`${key}T${String(hour).padStart(2, "0")}:00:00+05:30`).getTime();
}
