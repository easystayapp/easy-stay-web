"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ErrorNote } from "@/components/ui/primitives";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import { REPORT_REASONS, REPORT_REASON_LABEL, type ReportReason } from "@/lib/domain/ops";

/** "Report this listing" — files a moderation case with a 24 h acknowledgement SLA. */
export function ReportDialog({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<"new" | "duplicate" | null>(null);

  const submit = async () => {
    if (!reason) return setError("Choose what's wrong.");
    setBusy(true);
    setError(null);
    try {
      const r = await api.fileCase({ kind: "report", targetType: "property", targetId: propertyId, reason, details: details.trim() });
      setSent(r.duplicate ? "duplicate" : "new");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open onClose={onClose} title={sent ? "Thanks for telling us" : "Report this listing"}>
      {sent ? (
        <div className="mt-4 flex flex-col gap-4">
          <p className="flex items-start gap-2.5 rounded-xl bg-ok-bg px-3.5 py-3 text-sm font-semibold text-ok">
            <CircleCheck aria-hidden className="mt-px size-5 shrink-0" />
            {sent === "duplicate"
              ? "You've already reported this listing. We're on it."
              : "We'll acknowledge your report within 24 hours and resolve it within 15 days."}
          </p>
          <Link href="/profile/reports" className="text-center text-sm font-bold text-brand">Track your reports</Link>
          <Button variant="neutral" block onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <RadioGroup value={reason ?? ""} onValueChange={(v) => setReason(v as ReportReason)} aria-label="Reason" className="gap-3">
            {REPORT_REASONS.map((r) => (
              <div key={r} className="flex min-h-6 items-center gap-3">
                <RadioGroupItem id={`${id}-${r}`} value={r} />
                <Label htmlFor={`${id}-${r}`} className="cursor-pointer text-sm font-semibold">
                  {REPORT_REASON_LABEL[r]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-details`} className="text-sm font-extrabold">Details (optional)</Label>
            <Textarea
              id={`${id}-details`}
              value={details}
              maxLength={1000}
              placeholder="What happened? Dates, amounts and names help us act faster."
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-20"
            />
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button size="lg" block loading={busy} onClick={submit}>Send report</Button>
        </div>
      )}
    </AppDialog>
  );
}
