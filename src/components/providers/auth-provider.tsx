"use client";

import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoginDialog, type LoginCopy } from "@/components/auth/login-dialog";
import { api } from "@/lib/client/api";
import { firebaseAuth, firebaseConfigured } from "@/lib/client/firebase";
import type { Me } from "@/types/api";

export interface AuthContextValue {
  /** Firebase has reported the initial auth state. */
  ready: boolean;
  configured: boolean;
  user: FirebaseUser | null;
  /** Profile from our API; null while signed out or loading. */
  me: Me | null;
  refreshMe: () => Promise<Me | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Opens the login dialog if needed; resolves true once signed in. */
  requireLogin: (copy?: LoginCopy) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = firebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [dialog, setDialog] = useState<{ copy?: LoginCopy } | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const refreshMe = useCallback(async () => {
    if (!configured || !firebaseAuth().currentUser) {
      setMe(null);
      return null;
    }
    try {
      const m = await api.me();
      setMe(m);
      return m;
    } catch {
      setMe(null);
      return null;
    }
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    let lastUid: string | null | undefined;
    return onIdTokenChanged(firebaseAuth(), async (u) => {
      setUser(u);
      if (u?.uid !== lastUid) {
        lastUid = u?.uid ?? null;
        if (u) await refreshMe();
        else setMe(null);
      }
      setReady(true);
    });
  }, [configured, refreshMe]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
    await refreshMe();
  }, [refreshMe]);

  const signOut = useCallback(async () => {
    if (configured) await fbSignOut(firebaseAuth());
    setMe(null);
  }, [configured]);

  const requireLogin = useCallback(
    (copy?: LoginCopy) => {
      if (configured && firebaseAuth().currentUser) return Promise.resolve(true);
      pending.current?.(false);
      setDialog({ copy });
      return new Promise<boolean>((resolve) => {
        pending.current = resolve;
      });
    },
    [configured],
  );

  const closeDialog = (ok: boolean) => {
    setDialog(null);
    pending.current?.(ok);
    pending.current = null;
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ready, configured, user, me, refreshMe, signInWithGoogle, signOut, requireLogin }),
    [ready, configured, user, me, refreshMe, signInWithGoogle, signOut, requireLogin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog && (
        <LoginDialog copy={dialog.copy} onClose={() => closeDialog(false)} onDone={() => closeDialog(true)} />
      )}
    </AuthContext.Provider>
  );
}
