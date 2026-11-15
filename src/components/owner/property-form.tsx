"use client";

import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { OptionGrid, Segmented } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCatalog } from "@/hooks/use-catalog";
import { useToast } from "@/hooks/use-toast";
import { cx } from "@/lib/client/cx";
import {
  AMENITY_LABEL,
  ELECTRICITY_LABEL,
  FURNISHING_LABEL,
  GENDER_LABEL,
  PROPERTY_TYPE_LABEL,
  SHARING_BY_TYPE,
  SHARING_FIELD_LABEL,
  SHARING_LABEL,
} from "@/lib/domain/catalog";
import { formatPhone } from "@/lib/domain/format";
import { AMENITIES, ELECTRICITY_BILLING, FURNISHINGS, GENDERS, PROPERTY_TYPES, type SharingOption } from "@/lib/domain/types";
import type { FieldErrors, PropertyInput } from "@/lib/domain/validation";
import { PhotoUploader } from "./photo-uploader";

export interface FormProps {
  input: PropertyInput;
  set: (patch: Partial<PropertyInput>) => void;
  errors: FieldErrors;
  contactPhone: string;
}

const Req = () => (
  <span aria-hidden className="-ml-1 text-brand-dark">
    *
  </span>
);

const money = (v: string) => {
  const n = Number(v.replace(/\D/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
};

function RupeeInput({ id, value, onChange, invalid, placeholder, suffix }: { id: string; value: number | null; onChange: (n: number | null) => void; invalid?: boolean; placeholder?: string; suffix?: string }) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText className="text-base font-extrabold text-brand">₹</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        placeholder={placeholder}
        value={value != null ? value.toLocaleString("en-IN") : ""}
        onChange={(e) => onChange(money(e.target.value))}
        aria-invalid={invalid || undefined}
        className="font-bold"
      />
      {suffix && (
        <InputGroupAddon align="inline-end">
          <InputGroupText className="text-xs">{suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

/** Live "12/80" counter under a text field. */
export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span aria-hidden className={cx("ml-auto shrink-0 text-[11px] font-semibold tabular-nums", value.length >= max ? "text-brand-dark" : "text-muted-foreground")}>
      {value.length}/{max}
    </span>
  );
}

/**
 * A numbered card for one part of the listing form. The badge turns into a
 * green tick once its required fields are filled, so progress is visible at a glance.
 */
export function FormSection({
  id,
  step,
  title,
  hint,
  done,
  optional,
  children,
}: {
  id: string;
  step: number;
  title: string;
  hint?: string;
  done?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 rounded-[22px] border border-line bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className={cx(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors",
            done ? "bg-ok text-white" : "bg-blush text-brand",
          )}
        >
          {done ? <Check className="size-[18px]" strokeWidth={3} /> : step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="flex flex-wrap items-center gap-2 text-lg leading-tight font-extrabold">
            {title}
            {optional && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-muted-2 uppercase">Optional</span>}
          </h2>
          {hint && <p className="text-[13px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Type, sharing, rent and name. */
export function AboutFields({ input, set, errors }: Pick<FormProps, "input" | "set" | "errors">) {
  return (
    <div className="flex flex-col gap-6">
      <Field>
        <Label>
          Property type <Req />
        </Label>
        <Segmented
          label="Property type"
          options={PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABEL[t] }))}
          value={input.type}
          onChange={(t) => set({ type: t, sharing: SHARING_BY_TYPE[t][0] })}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field data-invalid={!!errors.sharing || undefined}>
          <FieldLabel htmlFor="sharing">
            {SHARING_FIELD_LABEL[input.type]} <Req />
          </FieldLabel>
          <Select value={input.sharing} onValueChange={(v) => set({ sharing: v as SharingOption })}>
            <SelectTrigger id="sharing" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {SHARING_BY_TYPE[input.type].map((s) => (
                <SelectItem key={s} value={s}>
                  {SHARING_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!errors.rent || undefined}>
          <FieldLabel htmlFor="rent">
            Monthly rent <Req />
          </FieldLabel>
          <RupeeInput id="rent" value={input.rent} onChange={(rent) => set({ rent })} invalid={!!errors.rent} placeholder="8,000" suffix={input.type === "pg" ? "per bed / month" : "per month"} />
          <FieldError>{errors.rent}</FieldError>
        </Field>
      </div>

      <Field data-invalid={!!errors.title || undefined}>
        <FieldLabel htmlFor="title">
          Property name <Req />
        </FieldLabel>
        <Input id="title" value={input.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Sri Sai Men's PG, Madhapur" maxLength={80} aria-invalid={!!errors.title || undefined} />
        <div className="flex items-start justify-between gap-3">
          <FieldError>{errors.title}</FieldError>
          <CharCount value={input.title} max={80} />
        </div>
      </Field>
    </div>
  );
}

/** Who the place is for. */
export function AudienceField({ input, set, bare }: Pick<FormProps, "input" | "set"> & { bare?: boolean }) {
  return (
    <Field>
      {!bare && (
        <Label>
          Available for <Req />
        </Label>
      )}
      <Segmented label="Available for" options={GENDERS.map((g) => ({ value: g, label: GENDER_LABEL[g] }))} value={input.availableFor} onChange={(availableFor) => set({ availableFor })} />
    </Field>
  );
}

/** City, locality, address and an optional map pin. */
export function LocationFields({ input, set, errors, bare }: Pick<FormProps, "input" | "set" | "errors"> & { bare?: boolean }) {
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const { cities } = useCatalog();
  const labels = cities.map((c) => c.label);
  // Keep a listing's current city selectable even if it's no longer offered.
  const cityOptions = !input.city || labels.includes(input.city) ? labels : [input.city, ...labels];
  const localities = cities.find((c) => c.label === input.city)?.localities ?? [];

  const pin = () => {
    if (!navigator.geolocation) return toast("Location isn't available on this device.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({ geo: { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) } });
        setLocating(false);
      },
      () => {
        toast("Couldn't get your location. Allow location access and try again.", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <Field>
      {!bare && (
        <Label>
          Location <Req />
        </Label>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={input.city || undefined} onValueChange={(city) => set({ city })}>
          <SelectTrigger id="city" aria-label="City" aria-invalid={!!errors.city || undefined} className="w-full">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent position="popper">
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id="locality"
          aria-label="Locality"
          placeholder="Locality, e.g. Madhapur"
          list="locality-options"
          autoComplete="off"
          value={input.locality}
          onChange={(e) => set({ locality: e.target.value })}
          aria-invalid={!!errors.locality || undefined}
        />
        <datalist id="locality-options">
          {localities.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </div>
      <Input
        id="address"
        aria-label="Property address"
        placeholder="House no., street, landmark"
        value={input.address}
        onChange={(e) => set({ address: e.target.value })}
        aria-invalid={!!errors.address || undefined}
      />
      <Button variant="soft" className={cx("border-[1.5px] border-dashed", input.geo ? "border-ok bg-ok-bg text-ok hover:bg-ok-bg hover:text-ok" : "border-primary")} onClick={pin} loading={locating}>
        {!locating && (input.geo ? <Check aria-hidden /> : <MapPin aria-hidden />)}
        {input.geo ? `Pinned at ${input.geo.lat.toFixed(4)}, ${input.geo.lng.toFixed(4)}` : "Or pin my current location"}
        {input.geo && <LocateFixed aria-hidden className="ml-1" />}
      </Button>
      <span className="text-xs text-muted-foreground">Add the address, or pin the map, or both. A pin lets seekers sort by distance.</span>
      <FieldError>{errors.city ?? errors.locality ?? errors.address}</FieldError>
    </Field>
  );
}

/** Registered number plus an optional separate WhatsApp number. */
export function ContactFields({ input, set, errors, contactPhone, bare }: FormProps & { bare?: boolean }) {
  const [waOn, setWaOn] = useState(!!input.whatsapp);
  return (
    <Field data-invalid={!!errors.whatsapp || undefined}>
      {!bare && (
        <Label>
          Contact <Req />
        </Label>
      )}
      <div className="flex items-center gap-2.5 rounded-[14px] bg-surface px-3.5 py-3">
        <Check aria-hidden className="size-5 text-ok" strokeWidth={2.6} />
        <div className="flex flex-col">
          <span className="text-sm font-bold">{formatPhone(contactPhone)}</span>
          <span className="text-xs text-muted-foreground">Registered number · used for calls{waOn ? "" : " & WhatsApp"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="wa-toggle"
          checked={waOn}
          onCheckedChange={(v) => {
            setWaOn(v === true);
            if (v !== true) set({ whatsapp: "" });
          }}
        />
        <Label htmlFor="wa-toggle" className="cursor-pointer font-semibold">
          Use a different WhatsApp number
        </Label>
      </div>
      {waOn && (
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText className="font-bold text-foreground">+91</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="whatsapp" type="tel" inputMode="tel" aria-label="WhatsApp number" placeholder="WhatsApp number" value={input.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} aria-invalid={!!errors.whatsapp || undefined} />
        </InputGroup>
      )}
      <FieldError>{errors.whatsapp}</FieldError>
    </Field>
  );
}

/** Everything required, in one flow. Used by the edit page; the add page lays the same pieces out as sections. */
export function BasicsFields({ input, set, errors, contactPhone, withPhotos }: FormProps & { withPhotos?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <AboutFields input={input} set={set} errors={errors} />
      <LocationFields input={input} set={set} errors={errors} />
      {withPhotos && (
        <Field data-invalid={!!errors.photos || undefined}>
          <Label>
            Photos <Req />
          </Label>
          <PhotoUploader photos={input.photos} onChange={(photos) => set({ photos })} invalid={!!errors.photos} />
          <FieldError>{errors.photos}</FieldError>
        </Field>
      )}
      <AudienceField input={input} set={set} />
      <ContactFields input={input} set={set} errors={errors} contactPhone={contactPhone} />
    </div>
  );
}

/** Optional details: deposit, furnishing, food, amenities, electricity, date, description. */
export function DetailsFields({ input, set, errors }: FormProps) {
  const toggleAmenity = (a: (typeof AMENITIES)[number]) =>
    set({ amenities: input.amenities.includes(a) ? input.amenities.filter((x) => x !== a) : [...input.amenities, a] });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.deposit || undefined}>
          <FieldLabel htmlFor="deposit">Security deposit</FieldLabel>
          <RupeeInput id="deposit" value={input.deposit} onChange={(deposit) => set({ deposit })} placeholder="Amount" />
          <FieldError>{errors.deposit}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="available-from">Available from</FieldLabel>
          <Input
            id="available-from"
            type="date"
            value={input.availableFrom ?? ""}
            onChange={(e) => set({ availableFrom: e.target.value || null })}
          />
          <span className="text-xs text-muted-foreground">Leave empty if available immediately.</span>
        </Field>
      </div>
      <Field>
        <Label>Furnishing</Label>
        <OptionGrid
          label="Furnishing"
          options={FURNISHINGS.map((f) => ({ value: f, label: f === "semi" ? "Semi" : FURNISHING_LABEL[f] }))}
          value={input.furnishing}
          onChange={(furnishing) => set({ furnishing })}
        />
      </Field>
      <Field>
        <Label>Facilities</Label>
        <div className="grid grid-cols-2 gap-2">
          {[{ key: "food", label: "Food available", on: input.food, toggle: () => set({ food: !input.food }) }, ...AMENITIES.map((a) => ({ key: a, label: AMENITY_LABEL[a], on: input.amenities.includes(a), toggle: () => toggleAmenity(a) }))].map((o) => (
            <label
              key={o.key}
              htmlFor={`fac-${o.key}`}
              className={cx(
                "flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 text-[13px] font-semibold",
                o.key === "attached_bath" && "col-span-2 sm:col-span-1",
                o.on ? "border-blush-line bg-blush" : "border-line",
              )}
            >
              <Checkbox id={`fac-${o.key}`} checked={o.on} onCheckedChange={o.toggle} />
              {o.label}
            </label>
          ))}
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="electricity">Electricity</FieldLabel>
        <Select value={input.electricity ?? undefined} onValueChange={(v) => set({ electricity: v as PropertyInput["electricity"] })}>
          <SelectTrigger id="electricity" className="w-full">
            <SelectValue placeholder="Choose billing" />
          </SelectTrigger>
          <SelectContent position="popper">
            {ELECTRICITY_BILLING.map((e) => (
              <SelectItem key={e} value={e}>
                {ELECTRICITY_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          rows={4}
          maxLength={1500}
          placeholder="Nearby metro or office hubs, house rules, meals, anything a seeker should know."
          value={input.description}
          onChange={(e) => set({ description: e.target.value })}
          className="resize-none"
        />
        <CharCount value={input.description} max={1500} />
      </Field>
    </div>
  );
}

/** "Add more details (optional)" expander used on the add flow. */
export function MoreDetails(props: FormProps) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-2xl border-[1.5px] border-line">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 bg-white p-4 text-left">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">Add more details (optional)</span>
          <span className="text-xs text-muted-foreground">Deposit, furnishing, food, amenities, electricity…</span>
        </span>
        <ChevronDown aria-hidden className={cx("size-5 text-brand transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-line-3 px-4 pt-4 pb-5">
        <DetailsFields {...props} />
      </CollapsibleContent>
    </Collapsible>
  );
}
