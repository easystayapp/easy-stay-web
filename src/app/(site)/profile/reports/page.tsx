"use client";

import { ChevronLeft, CircleCheck, Flag, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { EmptyState, ErrorNote } from "@/components/ui/primitives";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import { cx } from "@/lib/client/cx";
import { formatDate } from "@/lib/domain/format";
import { CASE_STATUS_LABEL, REPORT_REASONS, REPORT_REASON_LABEL, type ReportReason } from "@/lib/domain/ops";
import type { MyCase } from "@/types/api";

const when = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const isPast = (ms: number, now = Date.now()) => now > ms;

/** Received → acknowledged (24 h) → resolved (15 days), with the deadline for each pending step. */
function Timeline({ c }: { c: MyCase }) {
  const closed = c.status === "resolved" || c.status === "rejected";
  const steps = [
    { label: "Received", done: true, at: c.createdAt, due: null },
    { label: "Acknowledged", done: c.acknowledgedAt != null, at: c.acknowledgedAt, due: c.acknowledgeBy },
    { label: c.status === "rejected" ? "Closed" : "Resolved", done: closed, at: c.resolvedAt, due: c.resolveBy },
  ];
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((s) => {
        const late = !s.done && s.due != null && isPast(s.due);
        return (
          <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <span
              aria-hidden
              className={cx("size-2.5 shrink-0 rounded-full", s.done ? "bg-ok" : late ? "bg-brand" : "border-2 border-line-2 bg-white")}
            />
            <span className={cx("w-28 font-bold", s.done ? "text-ink" : "text-muted-foreground")}>{s.label}</span>
            <span className={cx("text-muted-foreground", late && "font-bold text-brand-dark")}>
              {s.done && s.at ? when(s.at) : s.due ? `${late ? "Overdue · was due" : "Due by"} ${when(s.due)}` : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CaseCard({ c }: { c: MyCase }) {
  const tone =
    c.status === "resolved" ? "bg-ok-bg text-ok" : c.status === "rejected" ? "bg-surface text-muted-2" : c.overdue ? "bg-blush text-brand-dark" : "bg-info-bg text-info";
  return (
    <li className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-extrabold">{REPORT_REASON_LABEL[c.reason]}</span>
          <span className="text-xs text-muted-foreground">
            {c.kind === "grievance" ? "Grievance" : "Report"} ·{" "}
            {c.targetType === "property" ? (
              <Link href={`/properties/${c.targetId}`} className="font-semibold">{c.targetTitle ?? "Listing"}</Link>
            ) : c.targetType === "platform" ? (
              "About EasyStay"
            ) : (
              "About a user"
            )}{" "}
            · {formatDate(new Date(c.createdAt))}
          </span>
        </div>
        <span className={cx("rounded-md px-2 py-1 text-[11px] font-extrabold", tone)}>{c.overdue ? "Overdue" : CASE_STATUS_LABEL[c.status]}</span>
      </div>
      {c.details && <p className="text-[13px] text-muted-2">“{c.details}”</p>}
      <Timeline c={c} />
      {c.resolution && (
        <p className="flex items-start gap-2 rounded-xl bg-surface px-3.5 py-3 text-[13px]">
          <CircleCheck aria-hidden className="mt-px size-4 shrink-0 text-ok" />
          <span><b>EasyStay:</b> {c.resolution}</span>
        </p>
      )}
    </li>
  );
}

function GrievanceDialog({ onClose, onFiled }: { onClose: () => void; onFiled: () => void }) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!reason) return setError("Choose what it's about.");
    setBusy(true);
    setError(null);
    try {
      await api.fileCase({ kind: "grievance", targetType: "platform", reason, details: details.trim() });
      onFiled();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <AppDialog open onClose={onClose} title="Raise a grievance" description="Reaches our grievance officer. Acknowledged within 24 hours, resolved within 15 days.">
      <div className="mt-4 flex flex-col gap-5">
        <RadioGroup value={reason ?? ""} onValueChange={(v) => setReason(v as ReportReason)} aria-label="Topic" className="gap-3">
          {REPORT_REASONS.map((r) => (
            <div key={r} className="flex min-h-6 items-center gap-3">
              <RadioGroupItem id={`${id}-${r}`} value={r} />
              <Label htmlFor={`${id}-${r}`} className="cursor-pointer text-sm font-semibold">{REPORT_REASON_LABEL[r]}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-d`} className="text-sm font-extrabold">What happened?</Label>
          <Textarea id={`${id}-d`} value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} className="min-h-24" />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button size="lg" block loading={busy} onClick={submit}>Submit grievance</Button>
      </div>
    </AppDialog>
  );
}

function Reports() {
  const [items, setItems] = useState<MyCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filing, setFiling] = useState(false);
  const load = useCallback(async () => {
    try {
      setItems((await api.myCases()).items);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-5 py-6 md:py-10">
      <Link href="/profile" className="inline-flex items-center gap-1 self-start text-sm font-bold">
        <ChevronLeft aria-hidden className="size-4" /> Profile
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold tracking-tight md:text-[30px]">Reports & grievances</h1>
          <p className="text-sm text-muted-foreground">We acknowledge within 24 hours and resolve within 15 days.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setFiling(true)}>
          <Plus aria-hidden className="size-4" /> Raise a grievance
        </Button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {!items ? (
        !error && <PageSpinner label="Loading reports" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Flag className="size-7" />} title="Nothing reported" body="Reports you make on listings, and grievances you raise, show up here with their status." />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </ul>
      )}
      {filing && (
        <GrievanceDialog
          onClose={() => setFiling(false)}
          onFiled={() => {
            setFiling(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

/** Grievance tracker: the user's reports and grievances with SLA progress. */
export default function ReportsPage() {
  return <RequireAuth title="Log in to see your reports">{() => <Reports />}</RequireAuth>;
}
