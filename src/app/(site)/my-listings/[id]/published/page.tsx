"use client";

import { PartyPopper } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { ButtonLink } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { ErrorNote, StatusBadge } from "@/components/ui/primitives";
import { PropertyImage } from "@/components/ui/property-image";
import { api, errorMessage } from "@/lib/client/api";
import { formatDate, formatRupees } from "@/lib/domain/format";
import type { EditableProperty } from "@/types/api";

function Published({ id }: { id: string }) {
  const [p, setP] = useState<EditableProperty | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.editable(id).then(setP).catch((e) => setError(errorMessage(e)));
  }, [id]);
  if (error) return <div className="container-page py-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!p) return <PageSpinner />;

  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-7 px-5 py-10 md:py-16">
      <div className="flex justify-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-ok-bg text-ok">
          <PartyPopper aria-hidden className="size-11" />
        </span>
      </div>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[28px] font-extrabold tracking-tight">Your property is live!</h1>
        <p className="text-[15px] text-muted-foreground">Seekers can now find it in search, nearby and category listings.</p>
      </div>
      <div className="flex gap-3 rounded-[20px] border border-line p-3.5">
        <PropertyImage src={p.input.photos[0]?.url} alt={p.input.title} seed={p.id} className="size-[72px] shrink-0 rounded-[14px]" iconSize={24} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[15px] font-bold">{p.input.title}</span>
          <span className="text-xs text-muted-foreground">
            {p.input.locality} · {formatRupees(p.input.rent ?? 0)}/month
          </span>
          <StatusBadge status={p.status} className="self-start" />
        </div>
      </div>
      {p.publishedAt && p.expiresAt && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-4">
            <div className="text-xs text-muted-foreground">Published</div>
            <div className="text-base font-extrabold">{formatDate(new Date(p.publishedAt))}</div>
          </div>
          <div className="rounded-2xl bg-surface p-4">
            <div className="text-xs text-muted-foreground">Expires</div>
            <div className="text-base font-extrabold">{formatDate(new Date(p.expiresAt))}</div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <ButtonLink href="/my-listings" size="lg" block>
          Go to dashboard
        </ButtonLink>
        <ButtonLink href={`/properties/${p.id}`} variant="outline" block>
          View as seekers see it
        </ButtonLink>
        <ButtonLink href="/my-listings/new" variant="text" className="self-center">
          + Add another property
        </ButtonLink>
      </div>
    </div>
  );
}

/** 17 · Published · 15 days */
export default function PublishedPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireOwner>{() => <Published id={id} />}</RequireOwner>;
}
