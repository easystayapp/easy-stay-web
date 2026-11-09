"use client";

import { Star, TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cx } from "@/lib/client/cx";
import { STATUS_LABEL } from "@/lib/domain/catalog";
import { initial } from "@/lib/domain/format";
import type { ListingStatus } from "@/lib/domain/types";

/* ------------------------------------------------------------- chips */

export function Chip({
  selected,
  children,
  className,
  ...rest
}: { selected?: boolean; children: ReactNode; className?: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors",
        selected ? "bg-brand font-bold text-white" : "bg-blush font-semibold text-brand-dark hover:bg-blush-2",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-md bg-blush px-2 py-1 text-[11px] font-bold text-brand-dark", className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------ status badge */

const STATUS_STYLE: Record<ListingStatus, string> = {
  active: "bg-ok-bg text-ok",
  expired: "bg-warn-bg text-warn",
  rented: "bg-info-bg text-info",
  paused: "bg-pause-bg text-pause",
  draft: "bg-surface text-muted-2",
};

export function StatusBadge({ status, className }: { status: ListingStatus; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-[0.06em]",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------- stars */

export function StarIcon({ className, filled = true }: { className?: string; filled?: boolean }) {
  return (
    <Star
      aria-hidden
      className={cx(className ?? "size-3.5", filled ? "fill-star text-star" : "fill-line-2 text-line-2")}
      strokeWidth={filled ? 1 : 1}
    />
  );
}

export function StarRow({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5`} className={cx("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={value >= n - 0.25} className="size-4" />
      ))}
    </span>
  );
}

/** "★ 4.3" or "New" when there are too few ratings. */
export function RatingPill({
  average,
  count,
  withCount,
  className,
}: {
  average: number | null;
  count: number;
  withCount?: boolean;
  className?: string;
}) {
  const isNew = count < 3 || average == null;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-extrabold", className)}>
      {isNew ? (
        <span className="rounded-md bg-ok-bg px-1.5 py-0.5 text-[11px] font-extrabold text-ok">New</span>
      ) : (
        <>
          <StarIcon />
          {average!.toFixed(1)}
          {withCount && <span className="font-semibold text-muted-foreground">({count})</span>}
        </>
      )}
    </span>
  );
}

export function FactorBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-[13px]">
      <span className="font-semibold text-muted-2">{label}</span>
      <span aria-hidden className="h-2 overflow-hidden rounded-full bg-line-3">
        <span className="block h-full rounded-full bg-star" style={{ width: `${((value ?? 0) / 5) * 100}%` }} />
      </span>
      <span className="text-right font-extrabold">{value != null ? value.toFixed(1) : "–"}</span>
    </div>
  );
}

/* ------------------------------------------------------------ avatar */

export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-blush font-extrabold text-brand", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial(name)}
    </span>
  );
}

/* ---------------------------------------------------- misc surfaces */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[20px] border border-line bg-white", className)}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-brand">{icon}</span>
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={cx("flex items-start gap-2 rounded-xl bg-blush px-3.5 py-3 text-[13px] font-semibold text-brand-dark", className)}>
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------ segmented */

/** Single-choice pill control (shadcn ToggleGroup), e.g. Male / Female / Anyone. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as T)}
      className={cx("flex w-full gap-1 rounded-[14px] bg-surface p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-10 flex-1 rounded-[10px]! px-2 text-[13px] font-semibold text-muted-foreground hover:bg-transparent hover:text-ink data-[state=on]:bg-white data-[state=on]:font-bold data-[state=on]:text-brand data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Option grid where the selected item is filled (property type, furnishing). */
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  label,
  columns = 3,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  columns?: number;
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as T)}
      className="grid! w-full gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-12 w-full rounded-xl! border-[1.5px] border-line bg-white px-2 text-[13px] font-semibold text-ink hover:border-input hover:bg-white data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:font-bold data-[state=on]:text-white"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Labelled settings row with a shadcn Switch. */
export function SwitchRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-sm font-bold">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
