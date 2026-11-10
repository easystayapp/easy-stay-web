"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { LiveWindowNote, ListingPreviewCard, ListingPreviewFull } from "@/components/owner/listing-preview";
import { BasicsFields, MoreDetails } from "@/components/owner/property-form";
import { useCity } from "@/hooks/use-city";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { api, errorMessage } from "@/lib/client/api";
import type { Me } from "@/types/api";
import { checkPropertyInput, emptyPropertyInput, type PropertyInput, type ValidationMode } from "@/lib/domain/validation";

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
    const first = Object.values(e)[0];
    if (first) {
      setShown(mode);
      setStep("form");
      toast(first, "error");
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
        <section className="rounded-[22px] md:border md:border-line md:p-6">
          <BasicsFields {...formProps} withPhotos />
        </section>
        <MoreDetails {...formProps} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 flex flex-col gap-4">
          <span className="eyebrow">Live preview</span>
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
