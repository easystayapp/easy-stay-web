"use client";

import { Check, TriangleAlert } from "lucide-react";
import { createContext, useCallback, useRef, useState } from "react";

type Tone = "success" | "error";
export type Toast = (message: string, tone?: Tone) => void;

export const ToastContext = createContext<Toast>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<Toast>((message, tone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-8">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-[14px] bg-ink px-4 py-3 text-[13px] font-semibold text-white shadow-[var(--shadow-sheet)]"
          >
            {toast.tone === "success" ? (
              <Check aria-hidden className="size-[18px] text-[#6EE7A8]" strokeWidth={2.6} />
            ) : (
              <TriangleAlert aria-hidden className="size-[18px] text-[#FFD98A]" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
