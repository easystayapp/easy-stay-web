"use client";

import { BadgeCheck, Camera, Clock, Flame, Building, ShieldCheck, ShieldQuestion, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/client/cx";
import { formatDate, freshnessLabel, isStale } from "@/lib/domain/format";
import {
  HEALTH_TIER_LABEL,
  WOMEN_FIRST_CHECKS,
  WOMEN_FIRST_LABEL,
  healthTier,
  type HealthTier,
  type NocState,
  type SafetyBadge,
} from "@/lib/domain/ops";
import type { CardSafety } from "@/types/api";

const TIER_STYLE: Record<HealthTier, string> = {
  excellent: "bg-ok-bg text-ok",
  good: "bg-ok-bg text-ok",
  fair: "bg-warn-bg text-warn",
  poor: "bg-blush text-brand-dark",
};

/** Compact "🛡 86" health score pill for result cards. */
export function HealthPill({ score, className }: { score: number; className?: string }) {
  const tier = healthTier(score);
  return (
    <span
      title={`EasyStay safety score ${score}/100 · ${HEALTH_TIER_LABEL[tier]}`}
      className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold", TIER_STYLE[tier], className)}
    >
      <ShieldCheck aria-hidden className="size-3.5" />
      <span className="sr-only">Safety score </span>
      {score}
    </span>
  );
}

export function WomenFirstPill({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md bg-tag-bg px-1.5 py-0.5 text-[11px] font-extrabold text-tag-dark", className)}>
      <Sparkles aria-hidden className="size-3.5" />
      Women-First
    </span>
  );
}

/** Row of trust signals under a card title. Renders nothing when there is nothing verified. */
export function CardSafetyRow({ safety }: { safety: CardSafety | null }) {
  if (!safety || (safety.healthScore == null && !safety.womenFirst && !safety.ownerVerified)) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {safety.healthScore != null && <HealthPill score={safety.healthScore} />}
      {safety.womenFirst && <WomenFirstPill />}
      {safety.ownerVerified && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ok">
          <BadgeCheck aria-hidden className="size-3.5" />
          Verified owner
        </span>
      )}
    </span>
  );
}

/** "Updated 3 days ago", muted amber once the listing has gone quiet. */
export function FreshnessLabel({ at, className }: { at: string | null; className?: string }) {
  if (!at) return null;
  const d = new Date(at);
  const stale = isStale(d);
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", stale ? "text-warn" : "text-muted-foreground", className)}>
      <Clock aria-hidden className="size-3.5" />
      {freshnessLabel(d)}
    </span>
  );
}

/* --------------------------------------------------------- detail page */

const NOC_ROWS: { key: keyof SafetyBadge["noc"]; label: string; icon: LucideIcon }[] = [
  { key: "fire", label: "Fire NOC", icon: Flame },
  { key: "structural", label: "Structural safety", icon: Building },
  { key: "electrical", label: "Electrical safety", icon: Zap },
];

const NOC_STATE: Record<NocState, { label: (d: string) => string; style: string }> = {
  valid: { label: (d) => `Valid till ${d}`, style: "text-ok" },
  expiring: { label: (d) => `Expires ${d}`, style: "text-warn" },
  expired: { label: (d) => `Expired ${d}`, style: "text-brand-dark" },
  missing: { label: () => "Not submitted", style: "text-muted-foreground" },
};

function ScoreRing({ score }: { score: number }) {
  const tier = healthTier(score);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex size-[68px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-line-3" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          className={tier === "fair" ? "stroke-star" : tier === "poor" ? "stroke-brand" : "stroke-ok"}
        />
      </svg>
      <span className="text-xl font-extrabold">{score}</span>
    </span>
  );
}

/** Safety Badge: health score, NOC expiry dates, owner KYC and Women-First checks. */
export function SafetySection({ safety }: { safety: SafetyBadge | null }) {
  const nothing =
    !safety ||
    (safety.healthScore == null &&
      !safety.ownerKycVerified &&
      !safety.photosVerified &&
      !safety.womenFirst.verified &&
      NOC_ROWS.every((r) => safety.noc[r.key].state === "missing"));

  return (
    <section aria-labelledby="safety-title" className="flex flex-col gap-4">
      <h2 id="safety-title" className="text-xl font-extrabold">Safety & verification</h2>
      {nothing || !safety ? (
        <div className="flex items-start gap-3 rounded-2xl bg-surface p-4">
          <ShieldQuestion aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-2">
            EasyStay hasn&apos;t verified this property yet. Visit in daylight, check fire exits and wiring, and never pay before seeing the room.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-4">
            {safety.healthScore != null ? (
              <>
                <ScoreRing score={safety.healthScore} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-extrabold">
                    Safety score · {HEALTH_TIER_LABEL[healthTier(safety.healthScore)]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Out of 100, from EasyStay&apos;s checks of fire, structure, wiring and security.
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-2">Safety score not published yet.</span>
            )}
          </div>

          <ul className="flex flex-col divide-y divide-line-3 border-t border-line-3">
            {NOC_ROWS.map(({ key, label, icon: Icon }) => {
              const n = safety.noc[key];
              const st = NOC_STATE[n.state];
              return (
                <li key={key} className="flex items-center gap-3 py-2.5">
                  <Icon aria-hidden className="size-4 text-brand" />
                  <span className="flex-1 text-sm font-semibold">{label}</span>
                  <span className={cx("text-[13px] font-bold", st.style)}>{st.label(n.expiresAt ? formatDate(new Date(n.expiresAt)) : "")}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-3 py-2.5">
              <BadgeCheck aria-hidden className="size-4 text-brand" />
              <span className="flex-1 text-sm font-semibold">Owner identity (KYC)</span>
              <span className={cx("text-[13px] font-bold", safety.ownerKycVerified ? "text-ok" : "text-muted-foreground")}>
                {safety.ownerKycVerified ? "Verified" : "Not verified"}
              </span>
            </li>
            <li className="flex items-center gap-3 py-2.5">
              <Camera aria-hidden className="size-4 text-brand" />
              <span className="flex-1 text-sm font-semibold">Photos match the property</span>
              <span className={cx("text-[13px] font-bold", safety.photosVerified ? "text-ok" : "text-muted-foreground")}>
                {safety.photosVerified ? "Verified" : "Not checked"}
              </span>
            </li>
          </ul>

          {safety.womenFirst.verified && (
            <div className="flex flex-col gap-2 rounded-xl bg-tag-bg p-3.5">
              <span className="flex items-center gap-1.5 text-sm font-extrabold text-tag-dark">
                <Sparkles aria-hidden className="size-4" />
                Women-First verified
              </span>
              <ul className="flex flex-col gap-1 text-[13px] text-tag-dark">
                {WOMEN_FIRST_CHECKS.map((k) => (
                  <li key={k}>✓ {WOMEN_FIRST_LABEL[k]}</li>
                ))}
              </ul>
              {safety.womenFirst.verifiedAt && (
                <span className="text-xs text-tag-dark/80">Checked on site {formatDate(new Date(safety.womenFirst.verifiedAt))}</span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
