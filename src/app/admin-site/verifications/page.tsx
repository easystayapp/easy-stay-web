"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { H1, Note, Panel, Pill, field, useAction, useAdminGet } from "@/components/admin/ui";
import { adminFetch, ago } from "@/lib/client/admin-api";
import type { Verification } from "@/lib/domain/ops";

const LABEL: Record<string, string> = { kyc: "Owner KYC", noc_fire: "Fire NOC", noc_structural: "Structural NOC", noc_electrical: "Electrical NOC", photos: "Photos" };

function Item({ v, onDone }: { v: Verification; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [exp, setExp] = useState(v.expiresAt ? new Date(v.expiresAt).toISOString().slice(0, 10) : "");
  const { busy, error, run } = useAction();
  const review = (decision: "approve" | "reject") =>
    run(async () => {
      await adminFetch(`/verifications/${encodeURIComponent(v.id)}`, {
        method: "POST",
        body: { decision, note, expiresAt: exp ? new Date(`${exp}T23:59:59+05:30`).getTime() : undefined },
      });
      onDone();
    });
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <b>{LABEL[v.kind]}</b>
        <Pill>{v.kind === "kyc" ? v.documentType : "listing"}</Pill>
        <span className="text-xs text-muted-foreground">{v.subjectId} · submitted {ago(v.submittedAt)}</span>
      </div>
      <div className="my-2 flex flex-wrap gap-2">
        {v.files.map((f, i) => (
          <a key={i} href={f} target="_blank" rel="noreferrer noopener" className="rounded-lg border px-3 py-1.5 text-sm font-semibold">File {i + 1}</a>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        {v.kind.startsWith("noc_") && <input className={field} type="date" value={exp} onChange={(e) => setExp(e.target.value)} title="NOC expiry date" />}
        <input className={`${field} sm:col-start-2`} placeholder="Note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => review("approve")}>Approve</Button>
        <Button size="sm" variant="destructive" disabled={busy || !note.trim()} onClick={() => review("reject")}>Reject</Button>
      </div>
      <Note error={error} />
    </Panel>
  );
}

export default function Verifications() {
  const { data, error, reload } = useAdminGet<{ items: Verification[] }>("/verifications");
  return (
    <>
      <H1>Verification queue</H1>
      {error && <p className="text-red-600">{error}</p>}
      {data?.items.length === 0 && <Panel>Nothing waiting. 🎉</Panel>}
      {data?.items.map((v) => <Item key={v.id} v={v} onDone={reload} />)}
    </>
  );
}
