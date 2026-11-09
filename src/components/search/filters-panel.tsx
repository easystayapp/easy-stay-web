"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cx } from "@/lib/client/cx";
import {
  AMENITY_LABEL,
  FURNISHING_LABEL,
  GENDER_LABEL,
  PROPERTY_TYPE_LABEL,
  SHARING_LABEL,
} from "@/lib/domain/catalog";
import { formatRupeesShort } from "@/lib/domain/format";
import { emptyFilters, sharingOptionsFor, type SearchFilters } from "@/lib/domain/search";
import { AMENITIES, FURNISHINGS, GENDERS, PROPERTY_TYPES } from "@/lib/domain/types";

type Opt = { value: string; label: string };
type Flag = { key: string; label: string; on: boolean; toggle: () => void };

/** One filter section. `multi` = any number, `single` = at most one. */
type Group =
  | { kind: "multi"; label: string; options: Opt[]; value: string[]; set: (v: string[]) => void; flags?: Flag[] }
  | { kind: "single"; label: string; options: Opt[]; value: string | null; set: (v: string | null) => void; flags?: Flag[] };

const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function groupsFor(f: SearchFilters, set: (patch: Partial<SearchFilters>) => void): Group[] {
  return [
    {
      kind: "multi",
      label: "Property type",
      options: PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABEL[t] })),
      value: f.types,
      set: (v) => {
        const types = v as SearchFilters["types"];
        const allowed = sharingOptionsFor(types);
        set({ types, sharing: f.sharing.filter((s) => allowed.includes(s)) });
      },
    },
    {
      kind: "multi",
      label: f.types.length === 1 && f.types[0] === "flat" ? "Flat size" : "Sharing / size",
      options: sharingOptionsFor(f.types).map((s) => ({ value: s, label: SHARING_LABEL[s] })),
      value: f.sharing,
      set: (v) => set({ sharing: v as SearchFilters["sharing"] }),
    },
    {
      kind: "single",
      label: "Rating",
      options: [
        { value: "4", label: "4★ & above" },
        { value: "3", label: "3★ & above" },
      ],
      value: f.minRating ? String(f.minRating) : null,
      set: (v) => set({ minRating: v === "4" ? 4 : v === "3" ? 3 : null }),
      flags: [
        { key: "o4", label: "Owner rated 4★+", on: f.ownerRated4, toggle: () => set({ ownerRated4: !f.ownerRated4 }) },
        { key: "a4", label: "Area rated 4★+", on: f.areaRated4, toggle: () => set({ areaRated4: !f.areaRated4 }) },
      ],
    },
    {
      kind: "multi",
      label: "Gender preference",
      options: GENDERS.map((g) => ({ value: g, label: GENDER_LABEL[g] })),
      value: f.genders,
      set: (v) => set({ genders: v as SearchFilters["genders"] }),
    },
    {
      kind: "multi",
      label: "Furnishing",
      options: FURNISHINGS.map((x) => ({ value: x, label: FURNISHING_LABEL[x] })),
      value: f.furnishing,
      set: (v) => set({ furnishing: v as SearchFilters["furnishing"] }),
    },
    {
      kind: "single",
      label: "Food",
      options: [
        { value: "yes", label: "Food available" },
        { value: "no", label: "No food" },
      ],
      value: f.food,
      set: (v) => set({ food: v === "yes" || v === "no" ? v : null }),
    },
    {
      kind: "multi",
      label: "Amenities",
      options: AMENITIES.map((a) => ({ value: a, label: AMENITY_LABEL[a] })),
      value: f.amenities,
      set: (v) => set({ amenities: v as SearchFilters["amenities"] }),
    },
    {
      kind: "single",
      label: "Available from",
      options: [
        { value: "now", label: "Immediately" },
        { value: "15d", label: "Within 15 days" },
      ],
      value: f.availableBy === "now" || f.availableBy === "15d" ? f.availableBy : null,
      set: (v) => set({ availableBy: v }),
    },
  ];
}

function RentInputs({ f, set }: { f: SearchFilters; set: (p: Partial<SearchFilters>) => void }) {
  const id = useId();
  const parse = (v: string) => {
    const n = Number(v.replace(/\D/g, ""));
    return v.trim() && Number.isFinite(n) ? n : null;
  };
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {(["minRent", "maxRent"] as const).map((k) => (
        <Field key={k} className="gap-1.5">
          <FieldLabel htmlFor={`${id}-${k}`} className="text-[11px] text-muted-foreground">
            {k === "minRent" ? "Minimum" : "Maximum"}
          </FieldLabel>
          <InputGroup className="h-12">
            <InputGroupAddon>
              <InputGroupText className="font-bold text-foreground">₹</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id={`${id}-${k}`}
              inputMode="numeric"
              placeholder={k === "minRent" ? "0" : "Any"}
              defaultValue={f[k] ?? ""}
              key={`${k}-${f[k] ?? ""}`}
              onBlur={(e) => {
                const v = parse(e.target.value);
                if (v !== f[k]) set({ [k]: v });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </InputGroup>
        </Field>
      ))}
    </div>
  );
}

function ChipToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "h-10 rounded-full border-[1.5px] px-4 text-[13px] transition-colors",
        on ? "border-brand bg-brand font-bold text-white" : "border-line bg-white font-semibold text-ink hover:border-input",
      )}
    >
      {children}
    </button>
  );
}

function CheckRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-semibold text-muted-2">
        {label}
      </Label>
    </div>
  );
}

/** Desktop sidebar rendering of one group with shadcn controls. */
function ListGroup({ g }: { g: Group }) {
  const id = useId();
  return (
    <div className="border-t border-line-3 pt-5">
    <FieldSet className="gap-3">
      <FieldLegend className="mb-0 text-sm font-extrabold">{g.label}</FieldLegend>
      {g.kind === "multi" ? (
        g.options.length > 3 ? (
          <MultiSelect label={g.label} options={g.options} value={g.value} onChange={g.set} placeholder="Any" />
        ) : (
          g.options.map((o) => (
            <CheckRow key={o.value} id={`${id}-${o.value}`} label={o.label} checked={g.value.includes(o.value)} onChange={() => g.set(toggleIn(g.value, o.value))} />
          ))
        )
      ) : (
        <RadioGroup value={g.value ?? "any"} onValueChange={(v) => g.set(v === "any" ? null : v)} className="gap-2.5" aria-label={g.label}>
          {[{ value: "any", label: "Any" }, ...g.options].map((o) => (
            <div key={o.value} className="flex items-center gap-2.5">
              <RadioGroupItem id={`${id}-${o.value}`} value={o.value} />
              <Label htmlFor={`${id}-${o.value}`} className="cursor-pointer text-sm font-semibold text-muted-2">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
      {g.flags?.map((fl) => <CheckRow key={fl.key} id={`${id}-${fl.key}`} label={fl.label} checked={fl.on} onChange={fl.toggle} />)}
    </FieldSet>
    </div>
  );
}

/**
 * All search refinements. `chips` matches the mobile Filters screen (04),
 * `list` the web results sidebar (W2).
 */
export function FiltersPanel({
  filters,
  onChange,
  variant,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  variant: "chips" | "list";
}) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch, page: 1 });
  const groups = groupsFor(filters, set);

  return (
    <div className={cx("flex flex-col", variant === "chips" ? "gap-7" : "gap-5")}>
      <div className="flex flex-col gap-3">
        <span className={variant === "chips" ? "text-[15px] font-extrabold" : "text-sm font-extrabold"}>Monthly rent</span>
        <RentInputs f={filters} set={set} />
      </div>
      {groups.map((g) =>
        variant === "list" ? (
          <ListGroup key={g.label} g={g} />
        ) : (
          <div key={g.label} role="group" aria-label={g.label} className="flex flex-col gap-3">
            <span className="text-[15px] font-extrabold">{g.label}</span>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) =>
                g.kind === "multi" ? (
                  <ChipToggle key={o.value} on={g.value.includes(o.value)} onClick={() => g.set(toggleIn(g.value, o.value))}>
                    {o.label}
                  </ChipToggle>
                ) : (
                  <ChipToggle key={o.value} on={g.value === o.value} onClick={() => g.set(g.value === o.value ? null : o.value)}>
                    {o.label}
                  </ChipToggle>
                ),
              )}
              {g.flags?.map((fl) => (
                <ChipToggle key={fl.key} on={fl.on} onClick={fl.toggle}>
                  {fl.label}
                </ChipToggle>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/** Removable chips summarising active filters ("PG ×", "₹5k – ₹10k ×"). */
export function activeChips(f: SearchFilters, onChange: (f: SearchFilters) => void) {
  const base = { ...f, page: 1 };
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const t of f.types) chips.push({ key: `t${t}`, label: PROPERTY_TYPE_LABEL[t], remove: () => onChange({ ...base, types: f.types.filter((x) => x !== t), sharing: [] }) });
  if (f.minRent != null || f.maxRent != null) {
    const label = `${f.minRent != null ? formatRupeesShort(f.minRent) : "₹0"} – ${f.maxRent != null ? formatRupeesShort(f.maxRent) : "Any"}`;
    chips.push({ key: "rent", label, remove: () => onChange({ ...base, minRent: null, maxRent: null }) });
  }
  for (const s of f.sharing) chips.push({ key: `s${s}`, label: SHARING_LABEL[s], remove: () => onChange({ ...base, sharing: f.sharing.filter((x) => x !== s) }) });
  for (const g of f.genders) chips.push({ key: `g${g}`, label: GENDER_LABEL[g], remove: () => onChange({ ...base, genders: f.genders.filter((x) => x !== g) }) });
  for (const x of f.furnishing) chips.push({ key: `f${x}`, label: FURNISHING_LABEL[x], remove: () => onChange({ ...base, furnishing: f.furnishing.filter((y) => y !== x) }) });
  if (f.food) chips.push({ key: "food", label: f.food === "yes" ? "Food" : "No food", remove: () => onChange({ ...base, food: null }) });
  for (const a of f.amenities) chips.push({ key: `a${a}`, label: AMENITY_LABEL[a], remove: () => onChange({ ...base, amenities: f.amenities.filter((y) => y !== a) }) });
  if (f.availableBy) chips.push({ key: "avail", label: f.availableBy === "now" ? "Immediately" : f.availableBy === "15d" ? "Within 15 days" : `By ${f.availableBy}`, remove: () => onChange({ ...base, availableBy: null }) });
  if (f.minRating) chips.push({ key: "rating", label: `${f.minRating}★ & above`, remove: () => onChange({ ...base, minRating: null }) });
  if (f.ownerRated4) chips.push({ key: "o4", label: "Owner 4★+", remove: () => onChange({ ...base, ownerRated4: false }) });
  if (f.areaRated4) chips.push({ key: "a4", label: "Area 4★+", remove: () => onChange({ ...base, areaRated4: false }) });
  return chips;
}

export function resetFilters(f: SearchFilters): SearchFilters {
  return { ...emptyFilters(f.city), q: f.q, sort: f.sort };
}
