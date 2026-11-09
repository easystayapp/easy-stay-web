"use client";

/* eslint-disable @next/next/no-img-element -- uploaded photos */
import { Camera, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/client/api";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/domain/catalog";
import type { Photo } from "@/lib/domain/types";

/** 3–5 listing photos. First photo is the cover; tap ★ to make another the cover. */
export function PhotoUploader({ photos, onChange, invalid }: { photos: Photo[]; onChange: (p: Photo[]) => void; invalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(0);
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - latest.current.length - uploading;
    const batch = [...files].slice(0, Math.max(0, room));
    if (files.length > batch.length) toast(`You can add up to ${MAX_PHOTOS} photos.`, "error");
    setUploading((n) => n + batch.length);
    for (const file of batch) {
      try {
        const uploaded = await api.uploadPhoto(file);
        onChange([...latest.current, uploaded]);
        latest.current = [...latest.current, uploaded];
      } catch (e) {
        toast(errorMessage(e), "error");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  };

  const tiles = photos.length + uploading;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {photos.map((p, i) => (
          <div key={p.path} className="group relative aspect-square overflow-hidden rounded-xl bg-surface">
            <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>
            ) : (
              <button
                type="button"
                aria-label={`Make photo ${i + 1} the cover`}
                onClick={() => onChange([p, ...photos.filter((x) => x.path !== p.path)])}
                className="absolute bottom-1 left-1 flex size-7 items-center justify-center rounded-md bg-white/90 text-ink"
              >
                <Star aria-hidden className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(photos.filter((x) => x.path !== p.path))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-blush text-brand">
            <Spinner className="size-5" aria-label="Uploading photo" />
          </div>
        ))}
        {tiles < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-label="Add photos"
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed bg-white text-[11px] font-bold text-brand hover:bg-blush ${invalid ? "border-destructive" : "border-brand"}`}
          >
            <Camera aria-hidden className="size-[22px]" />
            Add
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      <span className="text-xs font-semibold text-muted-foreground">
        {photos.length} of {MAX_PHOTOS} · add {MIN_PHOTOS}–{MAX_PHOTOS} · JPG, PNG or WebP under 5 MB
      </span>
    </div>
  );
}
