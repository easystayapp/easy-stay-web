"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { currentPosition, nearbyParams, type Position } from "@/lib/client/geo";

/** "Near me": asks for the device location (showing a friendly message if refused) and opens nearby results. */
export function useNearMe() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  /** The position, or null after telling the user why not. */
  const locate = useCallback(async (): Promise<Position | null> => {
    setBusy(true);
    try {
      return await currentPosition();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't find your location.", "error");
      return null;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  /** Opens nearby results, keeping the other filters in `base`. */
  const search = useCallback(
    async (base?: URLSearchParams) => {
      const pos = await locate();
      if (pos) router.push(`/properties?${nearbyParams(pos, base)}`);
    },
    [locate, router],
  );

  return { busy, locate, search };
}
