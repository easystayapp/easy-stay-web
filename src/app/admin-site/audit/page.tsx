"use client";

import { useState } from "react";
import { H1, Panel, field, useAdminGet } from "@/components/admin/ui";
import type { AuditEntry } from "@/lib/domain/ops";

export default function Audit() {
  const [target, setTarget] = useState("");
  const { data, error } = useAdminGet<{ items: AuditEntry[] }>(`/audit${target ? `?targetId=${encodeURIComponent(target)}` : ""}`);
  return (
    <>
      <H1>Audit log</H1>
      <input className={`${field} mb-3 max-w-sm`} placeholder="Filter by listing / user / case id" value={target} onChange={(e) => setTarget(e.target.value.trim())} />
      {error && <p className="text-red-600">{error}</p>}
      <Panel>
        <div className="divide-y text-sm">
          {data?.items.map((a) => (
            <div key={a.id} className="py-2">
              <b>{a.action}</b> <span className="text-muted-foreground">{a.targetType} {a.targetId} · {new Date(a.at).toLocaleString("en-IN")} · by {a.actorId}</span>
              <div className="text-xs">{JSON.stringify(a.before)} → {JSON.stringify(a.after)}{a.note && ` — ${a.note}`}</div>
            </div>
          ))}
          {data?.items.length === 0 && <div className="py-2">No entries.</div>}
        </div>
      </Panel>
    </>
  );
}
