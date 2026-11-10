"use client";

import { browserSessionPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/client/admin-api";
import { firebaseAuth } from "@/lib/client/firebase";
import { field } from "@/components/admin/ui";

/** Email + password only, on its own origin. Non-admin accounts are signed straight back out. */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = firebaseAuth();
      await setPersistence(auth, browserSessionPersistence); // closing the tab signs out
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await adminFetch("/me"); // throws unless this account is an admin
    } catch (err) {
      await signOut(firebaseAuth()).catch(() => {});
      const code = (err as { code?: string }).code;
      setError(
        code?.startsWith("auth/") ? "Incorrect email or password." : "This account doesn't have admin access.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-extrabold">EasyStay <span className="text-primary">Admin</span></div>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">Staff sign-in. Authorised accounts only.</p>
        <label className="mb-1 block text-xs font-bold">Email</label>
        <input className={`${field} mb-3`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mb-1 block text-xs font-bold">Password</label>
        <input className={`${field} mb-4`} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </main>
  );
}
