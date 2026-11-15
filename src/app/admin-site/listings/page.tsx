"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { H1, Note, Panel, Pill, field, useAction, useAdminGet } from "@/components/admin/ui";
import { adminFetch } from "@/lib/client/admin-api";
import { WOMEN_FIRST_CHECKS, WOMEN_FIRST_LABEL, WOMEN_FIRST_VALID_DAYS, womenFirstUntil, type PropertySafety, type WomenFirstChecks } from "@/lib/domain/ops";

interface Listing {
  id: string; title: string; type: string; status: string; rent: number; city: string; locality: string;
  ownerId: string; ownerName: string | null; ownerEmail: string | null; photo: string | null; safety: PropertySafety;
}

const isPast = (ms: number, now = Date.now()) => now > ms;

function WomenFirstPanel({ l, reload }: { l: Listing; reload: () => void }) {
  const [checks, setChecks] = useState<WomenFirstChecks>(l.safety.womenFirst);
  const [note, setNote] = useState("");
  const act = useAction();
  const until = womenFirstUntil(l.safety.womenFirst);
  const live = until !== null && !isPast(until);
  return (
    <Panel
      title="Women-First"
      right={live ? <Pill tone="green">badge live until {new Date(until).toLocaleDateString("en-IN")}</Pill> : <Pill>{until ? "lapsed — re-verify" : "not verified"}</Pill>}
    >
      <p className="mb-2 text-xs text-muted-foreground">
        Tick only what you confirmed on a site visit. All three = Women-First badge for {WOMEN_FIRST_VALID_DAYS} days. Saving restarts the clock.
      </p>
      <div className="flex flex-col gap-1.5">
        {WOMEN_FIRST_CHECKS.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} /> {WOMEN_FIRST_LABEL[k]}
          </label>
        ))}
      </div>
      <input className={`${field} mt-2`} placeholder="Visit notes (kept in the audit log)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button className="mt-2" size="sm" disabled={act.busy} onClick={() => act.run(async () => { await adminFetch(`/properties/${l.id}/women-first`, { method: "PUT", body: { ...checks, note } }); reload(); }, "Saved.")}>
        Save checks
      </Button>
      <Note error={act.error} done={act.done} />
    </Panel>
  );
}

function Detail({ l, reload }: { l: Listing; reload: () => void }) {
  const [score, setScore] = useState(l.safety.healthScore?.toString() ?? "");
  const [publish, setPublish] = useState(l.safety.healthPublished);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const health = useAction();
  const mod = useAction();
  const date = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString("en-IN") : "—");
  return (
    <>
      <Panel>
        <div className="flex gap-3">
          {l.photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={l.photo} alt="" className="size-20 rounded-xl object-cover" />}
          <div>
            <div className="font-extrabold">{l.title}</div>
            <div className="text-sm text-muted-foreground">{l.type} · {l.locality}, {l.city} · ₹{l.rent}</div>
            <div className="mt-1 flex gap-1"><Pill>{l.status}</Pill>{l.safety.hidden && <Pill tone="red">hidden</Pill>}{l.safety.ownerKycVerified && <Pill tone="green">KYC ✓</Pill>}</div>
            <div className="mt-1 text-xs text-muted-foreground">Owner: {l.ownerName} {l.ownerEmail} · <code>{l.ownerId}</code></div>
          </div>
        </div>
        <div className="mt-3 text-sm">NOC expiry — fire {date(l.safety.noc.fire)} · structural {date(l.safety.noc.structural)} · electrical {date(l.safety.noc.electrical)}</div>
      </Panel>
      <Panel title="Health score">
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${field} max-w-28`} type="number" min={0} max={100} placeholder="0-100" value={score} onChange={(e) => setScore(e.target.value)} />
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish to seekers</label>
        </div>
        <input className={`${field} mt-2`} placeholder="Reason for the change (kept in the audit log)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button className="mt-2" size="sm" disabled={health.busy || score === ""} onClick={() => health.run(async () => { await adminFetch(`/properties/${l.id}/health`, { method: "PUT", body: { score: Number(score), publish, note } }); reload(); }, "Saved.")}>Save score</Button>
        <Note error={health.error} done={health.done} />
      </Panel>
      <WomenFirstPanel l={l} reload={reload} />
      <Panel title={l.safety.hidden ? "Restore listing" : "Hide listing"}>
        {!l.safety.hidden && <input className={field} placeholder="Reason (shown to the owner)" value={reason} onChange={(e) => setReason(e.target.value)} />}
        {l.safety.hidden && <p className="text-sm text-muted-foreground">Hidden: {l.safety.hiddenReason}</p>}
        <Button className="mt-2" size="sm" variant={l.safety.hidden ? "primary" : "destructive"} disabled={mod.busy || (!l.safety.hidden && !reason.trim())} onClick={() => mod.run(async () => { await adminFetch(`/properties/${l.id}/moderate`, { method: "POST", body: { hide: !l.safety.hidden, reason } }); reload(); }, "Updated.")}>
          {l.safety.hidden ? "Restore (owner must resume)" : "Hide listing"}
        </Button>
        <Note error={mod.error} done={mod.done} />
      </Panel>
    </>
  );
}

function Listings() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id");
  const [input, setInput] = useState(id ?? "");
  const { data, error, reload } = useAdminGet<Listing>(id ? `/properties/${encodeURIComponent(id)}` : null);
  return (
    <>
      <H1>Listings</H1>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/listings?id=${encodeURIComponent(input.trim())}`); }}>
        <input className={field} placeholder="Listing id" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" size="sm">Open</Button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {data && <Detail key={data.id + data.safety.updatedAt} l={data} reload={reload} />}
    </>
  );
}

export default function Page() {
  return <Suspense><Listings /></Suspense>;
}
