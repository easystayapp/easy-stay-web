"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { ProfileShell } from "@/components/layout/profile-shell";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorNote, Segmented, SwitchRow } from "@/components/ui/primitives";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import { CONTACT_METHOD_LABEL, defaultGreeting } from "@/lib/domain/catalog";
import type { Me, OwnerSettingsDTO } from "@/types/api";
import { formatPhone } from "@/lib/domain/format";
import { CONTACT_METHODS, type ContactMethod } from "@/lib/domain/types";

function SettingsForm({ me }: { me: Me }) {
  const owner = me.owner as OwnerSettingsDTO;
  const router = useRouter();
  const toast = useToast();
  const { refreshMe } = useAuth();
  const [contact, setContact] = useState(formatPhone(owner.contactPhone));
  const [whatsapp, setWhatsapp] = useState(owner.whatsappPhone ? formatPhone(owner.whatsappPhone) : "");
  const [method, setMethod] = useState<ContactMethod>(owner.contactMethod);
  const [greeting, setGreeting] = useState(owner.greeting ?? defaultGreeting("pg").replace(/\n/g, " "));
  const [notify, setNotify] = useState(owner.notify);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateOwnerSettings({ contactPhone: contact, whatsappPhone: whatsapp || null, contactMethod: method, greeting, notify });
      await refreshMe();
      toast("Settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await api.disableOwnerTools();
      await refreshMe();
      toast("Owner tools turned off");
      router.push("/profile");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      setConfirmOff(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-7" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Owner settings</h1>
        <p className="text-sm text-muted-foreground">These apply to every property you list. You can still browse and contact other owners as usual.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-[22px] border border-line p-5">
        <h2 className="text-lg font-extrabold">How seekers contact you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="contact-phone">Listing contact number</FieldLabel>
            <Input
              id="contact-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              aria-describedby="contact-phone-hint"
              required
            />
            <FieldDescription id="contact-phone-hint" className="text-xs">Seekers call this number. Hidden until they log in.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="wa-phone">WhatsApp number</FieldLabel>
            <Input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              placeholder="Same as contact number"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Show these buttons on my listings</Label>
          <Segmented
            label="Contact buttons"
            options={CONTACT_METHODS.map((m) => ({ value: m, label: CONTACT_METHOD_LABEL[m] }))}
            value={method}
            onChange={setMethod}
          />
        </div>
        <Field>
          <FieldLabel htmlFor="greeting">Default WhatsApp greeting</FieldLabel>
          <Textarea id="greeting" rows={3} value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={500} className="resize-none" />
        </Field>
      </section>

      <section className="flex flex-col rounded-[22px] border border-line px-5 py-2">
        <h2 className="pt-3 pb-1 text-lg font-extrabold">Notifications</h2>
        <SwitchRow label="Listing expiry reminders" hint="3 days and 1 day before a listing expires" checked={notify.expiryReminders} onChange={(v) => setNotify({ ...notify, expiryReminders: v })} />
        <SwitchRow label="New rating on my property" hint="When someone rates one of your listings" checked={notify.newRating} onChange={(v) => setNotify({ ...notify, newRating: v })} />
        <SwitchRow label="Weekly summary email" hint="Views and ratings across all listings" checked={notify.weeklySummary} onChange={(v) => setNotify({ ...notify, weeklySummary: v })} />
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="text" onClick={() => setConfirmOff(true)}>
          Turn off owner tools
        </Button>
        <Button type="submit" loading={busy}>
          Save settings
        </Button>
      </div>

      <AppDialog open={confirmOff} onClose={() => setConfirmOff(false)} title="Turn off owner tools?">
        <div className="mt-3 flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-muted-2">
            Your live listings will be paused and hidden from search. Your listings, views and ratings are kept — turn owner tools back on anytime.
          </p>
          <Button variant="primary" size="lg" block loading={busy} onClick={turnOff}>
            Turn off and pause listings
          </Button>
          <Button variant="neutral" block onClick={() => setConfirmOff(false)}>
            Keep owner tools on
          </Button>
        </div>
      </AppDialog>
    </form>
  );
}

/** W7 · Profile & owner settings */
export default function OwnerSettingsPage() {
  return (
    <RequireOwner>
      {(me) => (
        <ProfileShell me={me}>
          <SettingsForm me={me} />
        </ProfileShell>
      )}
    </RequireOwner>
  );
}
