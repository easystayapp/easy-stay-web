"use client";

import { Bell, ChevronRight, Heart, KeyRound, LayoutGrid, LifeBuoy, Settings, Star, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { ProfileShell } from "@/components/layout/profile-shell";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar, ErrorNote } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/client/api";
import type { Me } from "@/types/api";
import { formatPhone } from "@/lib/domain/format";

function Row({ href, icon: Icon, label, hint, badge }: { href: string; icon: LucideIcon; label: string; hint?: string; badge?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 text-ink hover:bg-surface hover:text-ink">
      <Icon aria-hidden className="size-5 text-brand" />
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      {badge ? <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs font-extrabold text-brand-dark">{badge}</span> : null}
      <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
    </Link>
  );
}

function PersonalDetails({ me }: { me: Me }) {
  const { refreshMe, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(!me.displayName);
  const [name, setName] = useState(me.displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateProfile({ displayName: name });
      await refreshMe();
      setEditing(false);
      toast("Profile updated");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Profile</h1>

      <div className="flex flex-col gap-4 rounded-[22px] border border-line p-5">
        <div className="flex items-center gap-4">
          <Avatar name={me.displayName || "E"} size={56} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-lg font-extrabold">{me.displayName || "Add your name"}</span>
            <span className="text-sm text-muted-foreground">{me.phone ? formatPhone(me.phone) : me.email}</span>
            {me.phone && me.email && <span className="text-xs text-muted-foreground">{me.email}</span>}
          </div>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-bold text-brand hover:text-brand-dark">
              Edit
            </button>
          )}
        </div>
        {editing && (
          <form onSubmit={save} className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end" noValidate>
            <Field className="flex-1">
              <FieldLabel htmlFor="profile-name">Your name</FieldLabel>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Button type="submit" loading={busy}>Save</Button>
          </form>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div className={`flex flex-col gap-1 rounded-2xl px-4 py-3.5 ${me.ownerToolsOn ? "bg-ok-bg" : "bg-surface"}`}>
        <span className={`text-xs font-extrabold tracking-[0.06em] ${me.ownerToolsOn ? "text-ok" : "text-muted-2"}`}>
          {me.ownerToolsOn ? "OWNER TOOLS ON · VERIFIED" : "OWNER TOOLS OFF"}
        </span>
        <span className="text-[13px] text-muted-2">
          {me.ownerToolsOn ? "You can list and manage properties, and still browse." : "You can browse, save and contact owners"}
        </span>
      </div>

      {!me.ownerToolsOn && (
        <Link href="/owner/verify" className="flex items-center gap-4 rounded-[20px] border-[1.5px] border-blush-line bg-blush p-4 text-ink hover:text-ink">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-brand">
            <KeyRound aria-hidden className="size-[22px]" />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-base font-extrabold">Own a property?</span>
            <span className="text-[13px] text-muted-2">Turn on owner tools for this account to list. You&apos;ll keep browsing as before.</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-brand" />
        </Link>
      )}

      {me.ownerToolsOn && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Owner settings</span>
          <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
            <Row href="/my-listings" icon={LayoutGrid} label="My listings" />
            <Row href="/profile/owner-settings" icon={Settings} label="Contact & notification settings" hint={`Listing number ${formatPhone(me.owner?.contactPhone)}`} />
            <Row href="/notifications" icon={Bell} label="Expiry reminders" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {me.ownerToolsOn && <span className="eyebrow">Finding a place</span>}
        <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
          <Row href="/saved" icon={Heart} label="Saved properties" badge={me.savedCount} />
          <Row href="/profile/ratings" icon={Star} label="My ratings" />
          <Row href="/help" icon={LifeBuoy} label="Help & support" />
        </div>
      </div>

      <Button
        variant="outline"
        block
        className="md:hidden"
        onClick={async () => {
          await signOut();
          router.push("/welcome");
        }}
      >
        Log out
      </Button>
    </div>
  );
}

/** 10 · Profile (owner tools off) · 23 · Profile (owner tools on) */
export default function ProfilePage() {
  return (
    <RequireAuth title="Log in to see your profile">
      {(me) => (
        <ProfileShell me={me}>
          <PersonalDetails me={me} />
        </ProfileShell>
      )}
    </RequireAuth>
  );
}
