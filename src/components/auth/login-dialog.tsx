"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppDialog } from "@/components/ui/app-dialog";
import { LoginPanel } from "./login-panel";

export interface LoginCopy {
  title?: string;
  subtitle?: string;
}

/** Login over the current page, so the user lands right back where they were. */
export function LoginDialog({ copy, onClose, onDone }: { copy?: LoginCopy; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<"choose" | "name">("choose");
  const { user } = useAuth();
  return (
    <AppDialog open onClose={user ? onDone : onClose} title={copy?.title ?? "Log in"} hideTitle>
      <LoginPanel copy={copy} step={step} onStep={setStep} onDone={onDone} inDialog />
    </AppDialog>
  );
}
