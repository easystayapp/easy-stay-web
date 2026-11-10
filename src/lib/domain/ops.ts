/**
 * Domain model for the transactional layer: enquiries, visits, chat,
 * verification, safety, moderation, privacy and notifications.
 *
 * Modelling rules (all chosen to keep reads to ONE query and writes cheap):
 * - Times are epoch milliseconds (plain numbers: index-friendly, no Timestamp mapping).
 * - Ids are deterministic where a natural key exists (`enquiryId`, `caseId`), so
 *   creation is idempotent and needs no "does it exist?" query.
 * - Inbox rows are denormalised onto the enquiry (title, thumbnail, last message,
 *   unread counters). Listing an inbox is a single indexed query, with no joins.
 * - Chat messages are an append-only subcollection of the enquiry, paged by time.
 * - Safety (health score, NOC expiry) lives in its own doc keyed by property id, so the
 *   Android-shared `properties` document is never touched. Lists fetch it with one batched get.
 */

export type Ms = number;

/* -------------------------------------------------------------------- roles */

export const ROLES = ["seeker", "owner", "caretaker", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Per-user flags the web server owns. Separate from `users/{uid}` (shared with Android). */
export interface UserMeta {
  banned: boolean;
  bannedReason: string | null;
  /** Admin is granted via this flag or the `admin` custom claim. */
  admin: boolean;
  /** Set when a caretaker sub-account is linked to an owner (Later). */
  caretakerOf: string | null;
  consents: Consents;
  kyc: KycStatus;
  updatedAt: Ms;
}

export interface Consents {
  /** Required to use the service; always true while the account exists. */
  core: true;
  marketing: boolean;
  partnerSharing: boolean;
  updatedAt: Ms;
}

export const DEFAULT_CONSENTS: Consents = { core: true, marketing: false, partnerSharing: false, updatedAt: 0 };

export const defaultMeta = (now: Ms): UserMeta => ({
  banned: false,
  bannedReason: null,
  admin: false,
  caretakerOf: null,
  consents: { ...DEFAULT_CONSENTS, updatedAt: now },
  kyc: "none",
  updatedAt: now,
});

/* ----------------------------------------------------------------- enquiry */

export const ENQUIRY_STATUSES = ["open", "accepted", "declined", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const VISIT_STATUSES = ["requested", "confirmed", "rescheduled", "declined", "cancelled"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface Visit {
  /** Proposed / confirmed start time. */
  at: Ms;
  status: VisitStatus;
  /** Who last changed it, to show "waiting for you" vs "waiting for them". */
  by: "seeker" | "owner";
  note: string | null;
  updatedAt: Ms;
}

/**
 * One thread per (property, seeker). Id = `${propertyId}_${seekerId}`.
 * Holds the enquiry, its (single) visit and the inbox summary.
 */
export interface Enquiry {
  id: string;
  propertyId: string;
  ownerId: string;
  seekerId: string;
  status: EnquiryStatus;
  visit: Visit | null;
  /* denormalised for inbox rendering */
  propertyTitle: string;
  propertyThumb: string | null;
  seekerName: string;
  ownerName: string;
  lastMessage: string;
  lastMessageAt: Ms;
  lastSender: "seeker" | "owner" | "system";
  unreadSeeker: number;
  unreadOwner: number;
  /** Phones are revealed to the seeker only once this is set (owner accepted). */
  acceptedAt: Ms | null;
  createdAt: Ms;
  updatedAt: Ms;
}

export const enquiryId = (propertyId: string, seekerId: string) => `${propertyId}_${seekerId}`;

export interface Message {
  id: string;
  senderId: string;
  side: "seeker" | "owner" | "system";
  text: string;
  at: Ms;
}

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_VISIT_AHEAD_DAYS = 30;

/** Owner may move an enquiry to these; anything else is rejected. */
export const OWNER_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  open: ["accepted", "declined"],
  accepted: ["closed"],
  declined: ["accepted"],
  closed: [],
};

/* ------------------------------------------------------------ verification */

export const KYC_STATUSES = ["none", "pending", "verified", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const VERIFICATION_KINDS = ["kyc", "noc_fire", "noc_structural", "noc_electrical", "photos"] as const;
export type VerificationKind = (typeof VERIFICATION_KINDS)[number];

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** One reviewable submission. Id = `${subjectId}_${kind}` (latest submission wins). */
export interface Verification {
  id: string;
  kind: VerificationKind;
  /** Owner uid for `kyc`, property id for NOCs and photos. */
  subjectId: string;
  ownerId: string;
  status: VerificationStatus;
  /** Private storage keys (never public URLs). */
  files: string[];
  /** kyc: "aadhaar" | "pan". */
  documentType: string | null;
  /** NOCs: expiry date entered by the owner and confirmed by the admin. */
  expiresAt: Ms | null;
  reviewerId: string | null;
  reviewNote: string | null;
  submittedAt: Ms;
  reviewedAt: Ms | null;
}

export const verificationId = (subjectId: string, kind: VerificationKind) => `${subjectId}_${kind}`;

/** Published safety facts for a listing. Public to read, written only by admins. */
export interface PropertySafety {
  /** = property id. */
  id: string;
  /** 0-100, null until an admin publishes one. */
  healthScore: number | null;
  healthPublished: boolean;
  noc: { fire: Ms | null; structural: Ms | null; electrical: Ms | null };
  photosVerified: boolean;
  ownerKycVerified: boolean;
  /** Admin hid the listing; owners cannot resume it. */
  hidden: boolean;
  hiddenReason: string | null;
  updatedAt: Ms;
}

export const emptySafety = (propertyId: string, now: Ms): PropertySafety => ({
  id: propertyId,
  healthScore: null,
  healthPublished: false,
  noc: { fire: null, structural: null, electrical: null },
  photosVerified: false,
  ownerKycVerified: false,
  hidden: false,
  hiddenReason: null,
  updatedAt: now,
});

export type NocState = "valid" | "expiring" | "expired" | "missing";
export const NOC_WARN_DAYS = 30;

export function nocState(expiresAt: Ms | null, now: Ms): NocState {
  if (expiresAt === null) return "missing";
  if (expiresAt < now) return "expired";
  return expiresAt - now <= NOC_WARN_DAYS * 86_400_000 ? "expiring" : "valid";
}

/** Safety badge shown on a listing: only what an admin has published and verified. */
export function safetyBadge(raw: PropertySafety | null, now: Ms) {
  if (!raw) return null;
  // Docs are written with partial merges, so fill any missing fields.
  const d = emptySafety(raw.id, 0);
  const s: PropertySafety = { ...d, ...raw, noc: { ...d.noc, ...raw.noc } };
  if (s.hidden) return null;
  return {
    healthScore: s.healthPublished ? s.healthScore : null,
    noc: {
      fire: { expiresAt: s.noc.fire, state: nocState(s.noc.fire, now) },
      structural: { expiresAt: s.noc.structural, state: nocState(s.noc.structural, now) },
      electrical: { expiresAt: s.noc.electrical, state: nocState(s.noc.electrical, now) },
    },
    photosVerified: s.photosVerified,
    ownerKycVerified: s.ownerKycVerified,
  };
}

/* ------------------------------------------------------- cases (moderation) */

export const CASE_KINDS = ["report", "grievance", "takedown"] as const;
export type CaseKind = (typeof CASE_KINDS)[number];

export const REPORT_REASONS = ["fake", "wrong_info", "unavailable", "unsafe", "scam", "abusive", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const CASE_STATUSES = ["open", "acknowledged", "resolved", "rejected"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const SLA = {
  acknowledgeMs: 24 * 3_600_000,
  resolveMs: 15 * 86_400_000,
  takedownMs: 36 * 3_600_000,
} as const;

/**
 * Report, grievance or takedown request. Reports are deduplicated per reporter
 * and target (id = `${targetId}_${reporterId}`); grievances/takedowns get a random id.
 */
export interface Case {
  id: string;
  kind: CaseKind;
  status: CaseStatus;
  targetType: "property" | "user" | "message";
  targetId: string;
  reporterId: string;
  reason: ReportReason;
  details: string;
  acknowledgeBy: Ms;
  resolveBy: Ms;
  acknowledgedAt: Ms | null;
  resolvedAt: Ms | null;
  resolution: string | null;
  assigneeId: string | null;
  createdAt: Ms;
  updatedAt: Ms;
}

/** Deadline (ms) by which the case must be acted on; takedowns use the 36 h rule. */
export function slaDeadlines(kind: CaseKind, now: Ms) {
  return {
    acknowledgeBy: now + (kind === "takedown" ? SLA.takedownMs : SLA.acknowledgeMs),
    resolveBy: now + (kind === "takedown" ? SLA.takedownMs : SLA.resolveMs),
  };
}

export const isOverdue = (c: Case, now: Ms) =>
  (c.status === "open" && now > c.acknowledgeBy) || (c.status === "acknowledged" && now > c.resolveBy);

/* ---------------------------------------------------------------- audit log */

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  /** Before/after values, e.g. health score changes. */
  before: unknown;
  after: unknown;
  note: string | null;
  at: Ms;
}

/* ---------------------------------------------------------- notifications */

export const NOTIFICATION_TYPES = [
  "new_enquiry",
  "visit_update",
  "new_message",
  "verification",
  "case_update",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app route to open. */
  href: string;
  read: boolean;
  at: Ms;
}
