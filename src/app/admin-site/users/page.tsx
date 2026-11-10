"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { H1, Note, Panel, field, useAction } from "@/components/admin/ui";
import { adminFetch } from "@/lib/client/admin-api";

export default function Users() {
  const [uid, setUid] = useState("");
  const [reason, setReason] = useState("");
  const { busy, error, done, run } = useAction();
  const ban = (banned: boolean) => run(() => adminFetch(`/users/${encodeURIComponent(uid)}/ban`, { method: "POST", body: { banned, reason } }), banned ? "User banned and signed out." : "User restored.");
  return (
    <>
      <H1>Users</H1>
      <Panel title="Ban or restore a user">
        <input className={field} placeholder="User id (uid)" value={uid} onChange={(e) => setUid(e.target.value.trim())} />
        <input className={`${field} mt-2`} placeholder="Reason (required to ban)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="destructive" disabled={busy || !uid || !reason.trim()} onClick={() => ban(true)}>Ban</Button>
          <Button size="sm" variant="neutral" disabled={busy || !uid} onClick={() => ban(false)}>Restore</Button>
        </div>
        <Note error={error} done={done} />
        <p className="mt-3 text-xs text-muted-foreground">Banning disables the account, ends all sessions and pauses the user&apos;s listings.</p>
      </Panel>
    </>
  );
}
