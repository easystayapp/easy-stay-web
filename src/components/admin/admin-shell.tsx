"use client";

import { onIdTokenChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { adminFetch } from "@/lib/client/admin-api";
import { firebaseAuth, firebaseConfigured } from "@/lib/client/firebase";

const NAV = [
  ["/", "Dashboard"],
  ["/verifications", "Verification queue"],
  ["/cases", "Reports & grievances"],
  ["/listings", "Listings"],
  ["/users", "Users"],
  ["/audit", "Audit log"],
] as const;

type Admin = { uid: string; email: string | null; name: string | null };
const AdminCtx = createContext<Admin | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

/** Redirects to /login unless the signed-in user is confirmed as an admin by the API. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "anon" | "ok">(firebaseConfigured() ? "loading" : "anon");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const onLogin = path === "/login";

  useEffect(() => {
    if (!firebaseConfigured()) return;
    return onIdTokenChanged(firebaseAuth(), async (u) => {
      if (!u) {
        setAdmin(null);
        return setState("anon");
      }
      try {
        setAdmin(await adminFetch<Admin>("/me"));
        setState("ok");
      } catch {
        await signOut(firebaseAuth()); // signed in but not an admin (or session too old)
        setState("anon");
      }
    });
  }, []);

  useEffect(() => {
    if (state === "anon" && !onLogin) router.replace("/login");
    if (state === "ok" && onLogin) router.replace("/");
  }, [state, onLogin, router]);

  if (onLogin) return <>{children}</>;
  if (state !== "ok" || !admin) return <PageSpinner label="Checking access" />;

  return (
    <AdminCtx.Provider value={admin}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b bg-ink p-4 text-white md:w-60 md:border-r md:border-b-0">
          <div className="mb-4 text-lg font-extrabold">EasyStay <span className="text-coral">Admin</span></div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap no-underline ${
                  (href === "/" ? path === "/" : path.startsWith(href)) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 hidden text-xs text-white/60 md:block">
            <div className="truncate">{admin.email}</div>
            <Button size="xs" variant="ghost" className="mt-2 text-white/80 hover:bg-white/10 hover:text-white" onClick={() => signOut(firebaseAuth())}>
              Sign out
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-muted/40 p-4 md:p-8">{children}</main>
      </div>
    </AdminCtx.Provider>
  );
}
