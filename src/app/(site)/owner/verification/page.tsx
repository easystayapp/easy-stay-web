"use client";

import { BadgeCheck, Building, Camera, ChevronLeft, Clock, FileUp, Flame, ShieldCheck, TriangleAlert, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState, ErrorNote, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/hooks/use-toast";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { formatDate } from "@/lib/domain/format";
import { nocState, type VerificationKind } from "@/lib/domain/ops";
import { dayKey, addDays } from "@/lib/domain/time";
import type { MyVerification, OwnerListing } from "@/types/api";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type Status = { tone: "ok" | "warn" | "bad" | "muted"; label: string; note?: string | null };
const TONE: Record<Status["tone"], string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-blush text-brand-dark",
  muted: "bg-surface text-muted-2",
};

function StatusChip({ s }: { s: Status }) {
  return <span className={cx("shrink-0 rounded-md px-2 py-1 text-[11px] font-extrabold", TONE[s.tone])}>{s.label}</span>;
}

function statusOf(v: MyVerification | undefined, isNoc: boolean): Status {
  if (!v) return { tone: "muted", label: "Not submitted" };
  if (v.status === "pending") return { tone: "warn", label: "Under review" };
  if (v.status === "rejected") return { tone: "bad", label: "Rejected", note: v.reviewNote };
  if (isNoc && v.expiresAt) {
    const st = nocState(v.expiresAt, Date.now());
    if (st === "expired") return { tone: "bad", label: `Expired ${formatDate(new Date(v.expiresAt))}` };
    if (st === "expiring") return { tone: "warn", label: `Expires ${formatDate(new Date(v.expiresAt))}` };
    return { tone: "ok", label: `Valid till ${formatDate(new Date(v.expiresAt))}` };
  }
  return { tone: "ok", label: "Verified" };
}

const needsRenewal = (v: MyVerification, now = Date.now()) =>
  v.kind.startsWith("noc_") && v.status === "approved" && !!v.expiresAt && nocState(v.expiresAt, now) !== "valid";

/** A labelled file picker that shows the chosen file name. */
function FilePick({ label, hint, capture, file, onFile }: { label: string; hint?: string; capture?: "user"; file: File | null; onFile: (f: File | null) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-bold">{label}</Label>
      <label
        htmlFor={id}
        className="flex h-12 cursor-pointer items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-input px-3.5 text-sm hover:border-brand"
      >
        <FileUp aria-hidden className="size-4 shrink-0 text-brand" />
        <span className={cx("truncate", file ? "font-semibold" : "text-muted-foreground")}>{file ? file.name : "Choose a photo or PDF"}</span>
      </label>
      <input
        id={id}
        type="file"
        accept={capture ? "image/*" : ACCEPT}
        capture={capture}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function KycCard({ v, onDone }: { v: MyVerification | undefined; onDone: () => void }) {
  const toast = useToast();
  const status = statusOf(v, false);
  const [docType, setDocType] = useState<"aadhaar" | "pan">((v?.documentType as "aadhaar" | "pan") ?? "aadhaar");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = !v || v.status === "rejected";

  const submit = async () => {
    if (!doc || !selfie) return setError("Add both your ID and a selfie.");
    setBusy(true);
    setError(null);
    try {
      const [docPath, selfiePath] = await Promise.all([api.uploadDocument(doc), api.uploadDocument(selfie)]);
      await api.submitVerification({ kind: "kyc", files: [docPath, selfiePath], documentType: docType });
      toast("Submitted for review");
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-[22px] border border-line p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blush text-brand">
          <BadgeCheck aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-lg font-extrabold">Identity (KYC)</h2>
          <p className="text-[13px] text-muted-foreground">Verified owners get a badge on every listing and rank higher in search.</p>
        </div>
        <StatusChip s={status} />
      </div>
      {status.note && <ErrorNote>Reviewer note: {status.note}</ErrorNote>}
      {canSubmit ? (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <Segmented
            label="ID document"
            value={docType}
            onChange={setDocType}
            options={[
              { value: "aadhaar", label: "Aadhaar" },
              { value: "pan", label: "PAN card" },
            ]}
          />
          <FilePick
            label={docType === "aadhaar" ? "Aadhaar (masked)" : "PAN card"}
            hint={docType === "aadhaar" ? "Use a masked Aadhaar (only the last 4 digits visible). Download one from the UIDAI website." : "A clear photo of the front, all corners visible."}
            file={doc}
            onFile={setDoc}
          />
          <FilePick label="Selfie" hint="Face the camera in good light. We match it to your ID." capture="user" file={selfie} onFile={setSelfie} />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button loading={busy} onClick={submit} disabled={!doc || !selfie}>
            <Camera aria-hidden className="size-4" /> Submit for verification
          </Button>
          <p className="text-xs text-muted-foreground">Documents are stored privately and only seen by EasyStay reviewers.</p>
        </div>
      ) : v?.status === "pending" ? (
        <p className="flex items-center gap-2 text-sm text-muted-2">
          <Clock aria-hidden className="size-4" /> We usually review within 2 working days.
        </p>
      ) : null}
    </section>
  );
}

const NOCS: { kind: VerificationKind; label: string; icon: LucideIcon }[] = [
  { kind: "noc_fire", label: "Fire NOC", icon: Flame },
  { kind: "noc_structural", label: "Structural safety certificate", icon: Building },
  { kind: "noc_electrical", label: "Electrical safety certificate", icon: Zap },
];

function NocRow({ listingId, kind, label, icon: Icon, v, onDone }: { listingId: string; kind: VerificationKind; label: string; icon: LucideIcon; v: MyVerification | undefined; onDone: () => void }) {
  const toast = useToast();
  const id = useId();
  const status = statusOf(v, true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minDate = dayKey(addDays(new Date(), 1));

  const submit = async () => {
    if (!file || !expiry) return setError("Add the certificate and its expiry date.");
    setBusy(true);
    setError(null);
    try {
      const path = await api.uploadDocument(file);
      await api.submitVerification({ kind, subjectId: listingId, files: [path], expiresAt: new Date(`${expiry}T23:59:59+05:30`).getTime() });
      toast(`${label} submitted`);
      setOpen(false);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex items-center gap-3">
        <Icon aria-hidden className="size-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
        <StatusChip s={status} />
        {v?.status !== "pending" && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="shrink-0 text-[13px] font-bold text-brand hover:text-brand-dark">
            {open ? "Cancel" : v ? "Replace" : "Upload"}
          </button>
        )}
      </div>
      {status.note && <span className="pl-7 text-xs text-brand-dark">Reviewer note: {status.note}</span>}
      {open && (
        <div className="grid gap-3 rounded-2xl bg-surface p-3.5 sm:grid-cols-[1fr_170px]">
          <FilePick label="Certificate" file={file} onFile={setFile} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-exp`} className="text-sm font-bold">Valid until</Label>
            <Input id={`${id}-exp`} type="date" min={minDate} value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-12" />
          </div>
          {error && <ErrorNote className="sm:col-span-2">{error}</ErrorNote>}
          <Button size="sm" className="sm:col-span-2" loading={busy} disabled={!file || !expiry} onClick={submit}>
            Submit for review
          </Button>
        </div>
      )}
    </li>
  );
}

function Verification() {
  const [data, setData] = useState<{ verifications: MyVerification[]; listings: OwnerListing[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [verifications, listings] = await Promise.all([api.myVerifications(), api.myListings()]);
      setData({ verifications, listings: listings.items.filter((l) => l.status !== "draft") });
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error && !data) return <div className="container-page py-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!data) return <PageSpinner label="Loading verification" />;
  const find = (kind: VerificationKind, subjectId?: string) =>
    data.verifications.find((v) => v.kind === kind && (subjectId ? v.subjectId === subjectId : true));
  const expiringSoon = data.verifications.some(needsRenewal);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-6 md:py-10">
      <Link href="/profile" className="inline-flex items-center gap-1 self-start text-sm font-bold">
        <ChevronLeft aria-hidden className="size-4" /> Profile
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Verification & safety</h1>
        <p className="text-sm text-muted-foreground">
          Seekers see your verification and certificate expiry dates on every listing. Verified, certified places get a higher safety score.
        </p>
      </div>
      {expiringSoon && (
        <ErrorNote>A safety certificate has expired or expires within 30 days. Upload the renewed one to keep your safety score.</ErrorNote>
      )}

      <KycCard v={find("kyc")} onDone={load} />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <ShieldCheck aria-hidden className="size-5 text-brand" /> Safety certificates (NOCs)
        </h2>
        {data.listings.length === 0 ? (
          <EmptyState icon={<TriangleAlert className="size-7" />} title="No listings yet" body="Publish a listing, then upload its fire, structural and electrical certificates here." />
        ) : (
          data.listings.map((l) => (
            <div key={l.id} className="rounded-[22px] border border-line px-5 pt-4 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-extrabold">{l.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{l.locality}</span>
              </div>
              <ul className="divide-y divide-line-3">
                {NOCS.map((n) => (
                  <NocRow key={n.kind} listingId={l.id} {...n} v={find(n.kind, l.id)} onDone={load} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/** Owner KYC (selfie + Aadhaar/PAN) and per-listing NOC uploads with expiry dates. */
export default function VerificationPage() {
  return <RequireOwner>{() => <Verification />}</RequireOwner>;
}
