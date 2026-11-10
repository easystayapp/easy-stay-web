"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { H1, Note, Panel, Pill, field, useAction, useAdminGet } from "@/components/admin/ui";
import { adminFetch, ago, until } from "@/lib/client/admin-api";
import type { Case } from "@/lib/domain/ops";

type Row = Case & { overdue: boolean };

function CaseRow({ c, onDone }: { c: Row; onDone: () => void }) {
  const [text, setText] = useState("");
  const [hide, setHide] = useState(false);
  const { busy, error, run } = useAction();
  const act = (action: string) =>
    run(async () => {
      await adminFetch(`/cases/${encodeURIComponent(c.id)}`, { method: "POST", body: { action, resolution: text, hide } });
      onDone();
    });
  const deadline = c.status === "open" ? c.acknowledgeBy : c.resolveBy;
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={c.kind === "takedown" ? "red" : "gray"}>{c.kind}</Pill>
        <Pill>{c.reason}</Pill>
        {c.overdue && <Pill tone="red">OVERDUE</Pill>}
        <span className="text-xs text-muted-foreground">{ago(c.createdAt)} · {c.status === "open" ? "acknowledge" : "resolve"} {until(deadline)}</span>
      </div>
      <p className="my-2 text-sm">
        {c.targetType}{" "}
        {c.targetType === "property" ? <Link href={`/listings?id=${c.targetId}`}>{c.targetId}</Link> : <code>{c.targetId}</code>}
        {c.details && <> — “{c.details}”</>}
      </p>
      {c.status === "resolved" || c.status === "rejected" ? (
        <p className="text-sm text-muted-foreground">{c.status}: {c.resolution}</p>
      ) : (
        <>
          <input className={field} placeholder="Resolution / reply to reporter" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {c.status === "open" && <Button size="sm" variant="neutral" disabled={busy} onClick={() => act("acknowledge")}>Acknowledge</Button>}
            <Button size="sm" disabled={busy || !text.trim()} onClick={() => act("resolve")}>Resolve</Button>
            <Button size="sm" variant="destructive" disabled={busy || !text.trim()} onClick={() => act("reject")}>Reject</Button>
            {c.targetType === "property" && (
              <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Hide the listing</label>
            )}
          </div>
        </>
      )}
      <Note error={error} />
    </Panel>
  );
}

function Takedown({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState("");
  const [details, setDetails] = useState("");
  const { busy, error, done, run } = useAction();
  return (
    <Panel title="Start a 36-hour takedown">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="Listing id" value={id} onChange={(e) => setId(e.target.value.trim())} />
        <input className={field} placeholder="Notice reference / details" value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <Button className="mt-2" size="sm" disabled={busy || !id} onClick={() => run(async () => { await adminFetch("/cases", { method: "POST", body: { propertyId: id, details } }); onDone(); }, "Takedown started.")}>
        Start takedown
      </Button>
      <Note error={error} done={done} />
    </Panel>
  );
}

function Cases() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get("status") ?? "open");
  const kind = sp.get("kind");
  const qs = new URLSearchParams({ status, ...(kind ? { kind } : {}), ...(sp.get("overdue") ? { overdue: "1" } : {}) });
  const { data, error, reload } = useAdminGet<{ items: Row[] }>(`/cases?${qs}`);
  return (
    <>
      <H1>Reports & grievances</H1>
      <div className="mb-3 flex gap-2">
        {["open", "acknowledged", "resolved", "rejected"].map((s) => (
          <Button key={s} size="sm" variant={s === status ? "primary" : "neutral"} onClick={() => setStatus(s)}>{s}</Button>
        ))}
      </div>
      <Takedown onDone={reload} />
      {error && <p className="text-red-600">{error}</p>}
      {data?.items.length === 0 && <Panel>No {status} cases.</Panel>}
      {data?.items.map((c) => <CaseRow key={c.id} c={c} onDone={reload} />)}
    </>
  );
}

export default function Page() {
  return <Suspense><Cases /></Suspense>;
}
