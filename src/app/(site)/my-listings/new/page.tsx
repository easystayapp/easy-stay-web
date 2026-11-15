"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { LiveWindowNote, ListingPreviewCard, ListingPreviewFull } from "@/components/owner/listing-preview";
import { PhotoUploader } from "@/components/owner/photo-uploader";
import { AboutFields, AudienceField, ContactFields, DetailsFields, FormSection, LocationFields } from "@/components/owner/property-form";
import { useCity } from "@/hooks/use-city";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { api, errorMessage } from "@/lib/client/api";
import type { Me } from "@/types/api";
import { cx } from "@/lib/client/cx";
import { MIN_PHOTOS } from "@/lib/domain/catalog";
import { checkPropertyInput, emptyPropertyInput, type PropertyInput, type ValidationMode } from "@/lib/domain/validation";

/** Which form section each validation error lives in, and the field to focus. */
const ERROR_TARGET: Record<string, { section: string; field?: string }> = {
  type: { section: "sec-basics" },
  sharing: { section: "sec-basics", field: "sharing" },
  rent: { section: "sec-basics", field: "rent" },
  title: { section: "sec-basics", field: "title" },
  availableFor: { section: "sec-basics" },
  city: { section: "sec-location", field: "city" },
  locality: { section: "sec-location", field: "locality" },
  address: { section: "sec-location", field: "address" },
  photos: { section: "sec-photos" },
  whatsapp: { section: "sec-contact", field: "whatsapp" },
  deposit: { section: "sec-details", field: "deposit" },
};

/** Scrolls to a section and puts the cursor in the offending field. */
function goTo(target: { section: string; field?: string }) {
  document.getElementById(target.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (target.field) window.setTimeout(() => document.getElementById(target.field!)?.focus({ preventScroll: true }), 350);
}

/** The required items a listing needs before it can go live. */
function checklist(input: PropertyInput) {
  const e = checkPropertyInput(input, "publish").errors;
  return [
    { key: "title", label: "Property name", done: !e.title, section: "sec-basics" },
    { key: "rent", label: "Monthly rent", done: !e.rent, section: "sec-basics" },
    { key: "location", label: "Location", done: !(e.city || e.locality || e.address), section: "sec-location" },
    { key: "photos", label: `Photos (${input.photos.length}/${MIN_PHOTOS}+)`, done: !e.photos, section: "sec-photos" },
  ];
}

/** Progress bar + checklist. Tap an item to jump to it. */
function Progress({ input, compact }: { input: PropertyInput; compact?: boolean }) {
  const items = checklist(input);
  const done = items.filter((i) => i.done).length;
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-extrabold">{done === items.length ? "Ready to publish" : "Before you publish"}</span>
        <span className="text-xs font-bold text-muted-foreground">{done} of {items.length}</span>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Listing completion" className="h-1.5 overflow-hidden rounded-full bg-line-3">
        <div className={cx("h-full rounded-full transition-all duration-300", done === items.length ? "bg-ok" : "bg-brand")} style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {!compact && (
        <ul className="flex flex-col gap-0.5">
          {items.map((i) => (
            <li key={i.key}>
              <button type="button" onClick={() => goTo({ section: i.section })} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-[13px] font-semibold hover:bg-surface">
                <span
                  aria-hidden
                  className={cx("flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]", i.done ? "border-ok bg-ok text-white" : "border-line-2 bg-white")}
                >
                  {i.done && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span className={i.done ? "text-muted-foreground line-through decoration-line-2" : "text-ink"}>{i.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddProperty({ me }: { me: Me }) {
  const router = useRouter();
  const toast = useToast();
  const { city } = useCity();
  const [input, setInput] = useState<PropertyInput>(() => emptyPropertyInput(city));
  const [shown, setShown] = useState<ValidationMode | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [busy, setBusy] = useState<"publish" | "draft" | null>(null);
  const contactPhone = me.owner?.contactPhone ?? "";

  const set = (patch: Partial<PropertyInput>) => setInput((i) => ({ ...i, ...patch }));
  const errors = shown ? checkPropertyInput(input, shown).errors : {};

  const valid = (mode: ValidationMode) => {
    const e = checkPropertyInput(input, mode).errors;
    const [key, first] = Object.entries(e)[0] ?? [];
    if (first) {
      setShown(mode);
      setStep("form");
      toast(first, "error");
      // Wait a tick when coming back from the preview so the form is on screen.
      window.setTimeout(() => goTo(ERROR_TARGET[key] ?? { section: "sec-basics" }), 50);
      return false;
    }
    return true;
  };

  const save = async (publish: boolean) => {
    if (!valid(publish ? "publish" : "draft")) return;
    setBusy(publish ? "publish" : "draft");
    try {
      const created = await api.createProperty(input, publish);
      if (publish) router.push(`/my-listings/${created.id}/published`);
      else {
        toast("Saved as draft");
        router.push("/my-listings");
      }
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(null);
    }
  };

  if (step === "preview") {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 pt-5 pb-32 sm:px-6">
        <PageHeader title="Preview" subtitle="This is how seekers will see it" />
        <ListingPreviewFull input={input} contactPhone={contactPhone} />
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-line bg-white px-5 pt-3.5 pb-6">
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep("form")}>
            Edit
          </Button>
          <Button size="lg" className="flex-[2]" loading={busy === "publish"} onClick={() => save(true)}>
            Publish property
          </Button>
        </div>
      </div>
    );
  }

  const formProps = { input, set, errors, contactPhone };
  return (
    <div className="container-page grid gap-10 pt-5 pb-32 md:py-10 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-7">
        <PageHeader
          back="/my-listings"
          title="Add property"
          subtitle={
            <>
              Takes about 1–2 minutes. Fields marked <span className="text-brand-dark">*</span> are required.
            </>
          }
        />
        <div className="lg:hidden">
          <Progress input={input} compact />
        </div>

        <FormSection id="sec-basics" step={1} title="The basics" hint="What it is, who it's for and what it costs." done={checklist(input).slice(0, 2).every((i) => i.done)}>
          <div className="flex flex-col gap-6">
            <AboutFields input={input} set={set} errors={errors} />
            <AudienceField input={input} set={set} />
          </div>
        </FormSection>

        <FormSection id="sec-location" step={2} title="Location" hint="Seekers search by area, so be specific." done={checklist(input)[2].done}>
          <LocationFields input={input} set={set} errors={errors} bare />
        </FormSection>

        <FormSection
          id="sec-photos"
          step={3}
          title="Photos"
          hint={`Add ${MIN_PHOTOS} or more clear, well-lit photos. The first one is the cover; tap ★ to change it.`}
          done={checklist(input)[3].done}
        >
          <div className="flex flex-col gap-2">
            <PhotoUploader photos={input.photos} onChange={(photos) => set({ photos })} invalid={!!errors.photos} />
            <FieldError>{errors.photos}</FieldError>
          </div>
        </FormSection>

        <FormSection id="sec-details" step={4} title="More details" optional hint="Listings with a deposit, facilities and a description get more enquiries.">
          <DetailsFields {...formProps} />
        </FormSection>

        <FormSection id="sec-contact" step={5} title="Contact" hint="How seekers reach you once they log in." done>
          <ContactFields {...formProps} bare />
        </FormSection>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 flex flex-col gap-4">
          <Progress input={input} />
          <span className="eyebrow pt-1">Live preview</span>
          <ListingPreviewCard input={input} />
          <LiveWindowNote />
          <Button size="lg" block loading={busy === "publish"} onClick={() => save(true)}>
            Publish property
          </Button>
          <Button variant="neutral" block loading={busy === "draft"} onClick={() => save(false)}>
            Save as draft
          </Button>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-line bg-white px-5 pt-3.5 pb-6 lg:hidden">
        <Button variant="neutral" size="lg" loading={busy === "draft"} onClick={() => save(false)}>
          Draft
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            if (valid("publish")) {
              setStep("preview");
              window.scrollTo({ top: 0 });
            }
          }}
        >
          Preview listing
        </Button>
      </div>
    </div>
  );
}

/** 15 · Add property · 16 · Preview · W6 · Add property + live preview */
export default function AddPropertyPage() {
  return <RequireOwner>{(me) => <AddProperty me={me} />}</RequireOwner>;
}
