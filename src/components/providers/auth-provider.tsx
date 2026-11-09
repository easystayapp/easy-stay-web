"use client";

import {
  GoogleAuthProvider,
  linkWithPhoneNumber,
  onIdTokenChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoginDialog, type LoginCopy } from "@/components/auth/login-dialog";
import { api } from "@/lib/client/api";
import { firebaseAuth, firebaseConfigured } from "@/lib/client/firebase";
import type { Me } from "@/types/api";

export type ConfirmCode = (code: string) => Promise<void>;

export interface AuthContextValue {
  /** Firebase has reported the initial auth state. */
  ready: boolean;
  configured: boolean;
  user: FirebaseUser | null;
  /** Profile from our API; null while signed out or loading. */
  me: Me | null;
  refreshMe: () => Promise<Me | null>;
  signInWithGoogle: () => Promise<void>;
  /**
   * Sends an OTP. `link` attaches the number to the signed-in account (owner
   * verification); `signin` signs in with it. Resolves to a code confirmer.
   */
  sendOtp: (phoneE164: string, container: HTMLElement, mode: "signin" | "link") => Promise<ConfirmCode>;
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

  const sendOtp = useCallback(
    async (phone: string, container: HTMLElement, mode: "signin" | "link"): Promise<ConfirmCode> => {
      const auth = firebaseAuth();
      const host = document.createElement("div");
      container.appendChild(host);
      const verifier = new RecaptchaVerifier(auth, host, { size: "invisible" });
      try {
        const confirmation =
          mode === "link" && auth.currentUser
            ? await linkWithPhoneNumber(auth.currentUser, phone, verifier)
            : await signInWithPhoneNumber(auth, phone, verifier);
        return async (code: string) => {
          const cred = await confirmation.confirm(code);
          // Refresh so the ID token carries the verified phone_number claim.
          await cred.user.getIdToken(true);
          await refreshMe();
        };
      } finally {
        verifier.clear();
        host.remove();
      }
    },
    [refreshMe],
  );

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
    () => ({ ready, configured, user, me, refreshMe, signInWithGoogle, sendOtp, signOut, requireLogin }),
    [ready, configured, user, me, refreshMe, signInWithGoogle, sendOtp, signOut, requireLogin],
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
