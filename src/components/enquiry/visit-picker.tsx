"use client";

import { useState } from "react";
import { cx } from "@/lib/client/cx";
import { VISIT_SLOTS } from "@/lib/domain/catalog";
import { addDays, dayKey, istHour, parseDayKey } from "@/lib/domain/time";

/** Days offered for a visit. The server accepts up to 30 days ahead. */
const DAYS_AHEAD = 14;
/** Matches the server: visits must start at least 30 minutes from now. */
const LEAD_MS = 30 * 60_000;

function dayLabel(key: string, i: number) {
  if (i === 0) return { top: "Today", bottom: "" };
  if (i === 1) return { top: "Tmrw", bottom: "" };
  const d = parseDayKey(key)!;
  return {
    top: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Kolkata" }),
    bottom: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
  };
}

/** Day strip + hour slots. `value` is the chosen start time (epoch ms) or null. */
export function VisitPicker({ value, onChange }: { value: number | null; onChange: (at: number | null) => void }) {
  // "Now" is fixed for the life of the picker so slots don't shift under the user's finger.
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => dayKey(addDays(new Date(now), i)));
  const openSlots = (key: string) => VISIT_SLOTS.filter((s) => istHour(key, s.hour) >= now + LEAD_MS);
  const firstOpenDay = days.find((k) => openSlots(k).length) ?? days[1];
  const [day, setDay] = useState(() => (value ? dayKey(new Date(value)) : firstOpenDay));

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Visit day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((k, i) => {
          const { top, bottom } = dayLabel(k, i);
          const full = openSlots(k).length === 0;
          const on = k === day;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={full}
              onClick={() => {
                setDay(k);
                if (value && dayKey(new Date(value)) !== k) onChange(null);
              }}
              className={cx(
                "flex h-14 w-[58px] shrink-0 flex-col items-center justify-center rounded-xl border-[1.5px] text-[13px] leading-tight transition-colors disabled:opacity-40",
                on ? "border-brand bg-brand font-bold text-white" : "border-line bg-white font-semibold text-ink hover:border-input",
              )}
            >
              <span>{top}</span>
              {bottom && <span className={cx("text-[11px]", on ? "text-white/85" : "text-muted-foreground")}>{bottom}</span>}
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label="Visit time" className="grid grid-cols-3 gap-2">
        {VISIT_SLOTS.map((s) => {
          const at = istHour(day, s.hour);
          const ok = at >= now + LEAD_MS;
          const on = value === at;
          return (
            <button
              key={s.hour}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!ok}
              onClick={() => onChange(on ? null : at)}
              className={cx(
                "h-10 rounded-[10px] border-[1.5px] px-1 text-[12px] transition-colors disabled:opacity-35",
                on ? "border-brand bg-brand font-bold text-white" : "border-line bg-white font-semibold text-ink hover:border-input",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
