"use client";

/**
 * Typed client for the EasyStay API. Pages never talk to a database SDK —
 * only to these functions — so the backend can change without UI changes.
 */
import type {
  CaseRequest,
  DocUploadTicket,
  EnquiryAction,
  InboxResponse,
  InboxSide,
  MessagesResponse,
  MyCase,
  MyVerification,
  ThreadResponse,
  VerificationRequest,
  ContactInfo,
  EditableProperty,
  Me,
  MyRatingListItem,
  MyRatingResponse,
  OwnerListingsResponse,
  FeaturedStay,
  OwnerSettingsUpdate,
  OwnerToolsRequest,
  ProfileUpdate,
  PropertyDetail,
  PropertyStats,
  RatingInput,
  RatingsResponse,
  ReminderItem,
  SavedItem,
  SearchResponse,
  TopOwner,
  Suggestion,
  UploadTicket,
  UploadedPhoto,
} from "@/types/api";
import type { ListingAction } from "@/lib/domain/listing";
import { serializeFilters, type SearchFilters } from "@/lib/domain/search";
import type { ContactChannel } from "@/lib/domain/types";
import type { PropertyInput } from "@/lib/domain/validation";
import { firebaseAuth, firebaseConfigured } from "./firebase";

export interface InboxNotification {
  id: string;
  type: "new_enquiry" | "visit_update" | "new_message" | "verification" | "case_update";
  title: string;
  body: string;
  href: string;
  read: boolean;
  at: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, string> | null,
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!firebaseConfigured()) return {};
  const user = firebaseAuth().currentUser;
  return user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = await authHeader();
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(path, { method, headers, body: payload, cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? "internal", e?.message ?? "Something went wrong.", e?.details ?? null);
  }
  return json as T;
}

const enc = encodeURIComponent;

export const api = {
  /* public */
  search: (f: SearchFilters) => request<SearchResponse>("GET", `/api/properties?${serializeFilters(f)}`),
  suggestions: (q: string, city: string) =>
    request<{ items: Suggestion[] }>("GET", `/api/properties/suggestions?q=${enc(q)}&city=${enc(city)}`),
  topOwners: (city: string) => request<{ items: TopOwner[] }>("GET", `/api/owners/top?city=${enc(city)}`),
  featured: (city: string) => request<{ items: FeaturedStay[] }>("GET", `/api/properties/featured?city=${enc(city)}`),
  property: (id: string) => request<PropertyDetail>("GET", `/api/properties/${enc(id)}`),
  recordView: (id: string, deviceId: string) =>
    request<{ counted: boolean }>("POST", `/api/properties/${enc(id)}/views`, { deviceId }),
  ratings: (id: string) => request<RatingsResponse>("GET", `/api/properties/${enc(id)}/ratings`),

  /* seeker */
  contact: (id: string, channel: ContactChannel) =>
    request<ContactInfo>("POST", `/api/properties/${enc(id)}/contact`, { channel }),
  myRating: (id: string) => request<MyRatingResponse>("GET", `/api/properties/${enc(id)}/ratings/mine`),
  rate: (id: string, input: RatingInput) =>
    request<MyRatingResponse>("PUT", `/api/properties/${enc(id)}/ratings`, input),
  savedIds: () => request<{ ids: string[] }>("GET", "/api/me/saved?ids=1"),
  saved: () => request<{ items: SavedItem[] }>("GET", "/api/me/saved"),
  save: (id: string) => request<{ ok: true }>("PUT", `/api/me/saved/${enc(id)}`),
  unsave: (id: string) => request<{ ok: true }>("DELETE", `/api/me/saved/${enc(id)}`),
  myRatings: () => request<{ items: MyRatingListItem[] }>("GET", "/api/me/ratings"),

  /* enquiries, visits & chat */
  sendEnquiry: (body: { propertyId: string; message?: string; visitAt?: number | null }) =>
    request<{ id: string; created: boolean }>("POST", "/api/enquiries", body),
  enquiries: (as: InboxSide, after?: number) =>
    request<InboxResponse>("GET", `/api/enquiries?as=${as}${after ? `&after=${after}` : ""}`),
  thread: (id: string) => request<ThreadResponse>("GET", `/api/enquiries/${enc(id)}`),
  messages: (id: string, before?: number) =>
    request<MessagesResponse>("GET", `/api/enquiries/${enc(id)}/messages${before ? `?before=${before}` : ""}`),
  postMessage: (id: string, text: string) => request<{ ok: true }>("POST", `/api/enquiries/${enc(id)}/messages`, { text }),
  enquiryAction: (id: string, body: { action: EnquiryAction; visitAt?: number; note?: string }) =>
    request<unknown>("POST", `/api/enquiries/${enc(id)}`, body),

  /* reports & grievances */
  fileCase: (body: CaseRequest) => request<{ id: string; duplicate: boolean }>("POST", "/api/reports", body),
  myCases: () => request<{ items: MyCase[] }>("GET", "/api/me/cases"),

  /* owner verification (KYC, NOCs) */
  myVerifications: () => request<MyVerification[]>("GET", "/api/me/verifications"),
  submitVerification: (body: VerificationRequest) =>
    request<{ id: string; status: "pending" }>("POST", "/api/me/verifications", body),
  /** Uploads a private document; returns its storage key (never a public URL). */
  uploadDocument: async (file: File): Promise<string> => {
    const ticket = await request<DocUploadTicket>("POST", "/api/me/verifications/upload", { contentType: file.type, size: file.size });
    if (ticket.mode === "direct") {
      const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file }).catch(() => null);
      if (!res?.ok) throw new ApiError(res?.status ?? 0, "upload_failed", "Upload failed. Check your connection and try again.", null);
      return ticket.path;
    }
    const form = new FormData();
    form.append("file", file);
    return (await request<{ path: string }>("POST", "/api/me/verifications/upload", form)).path;
  },

  /* account */
  me: () => request<Me>("GET", "/api/me"),
  updateProfile: (body: ProfileUpdate) => request<Me>("PATCH", "/api/me", body),
  enableOwnerTools: (body: OwnerToolsRequest) => request<Me>("POST", "/api/me/owner-tools", body),
  disableOwnerTools: () => request<Me>("DELETE", "/api/me/owner-tools"),
  updateOwnerSettings: (body: OwnerSettingsUpdate) => request<Me>("PATCH", "/api/me/owner-settings", body),

  /* owner */
  myListings: () => request<OwnerListingsResponse>("GET", "/api/me/listings"),
  notifications: () => request<{ items: ReminderItem[] }>("GET", "/api/me/notifications"),
  /** In-app notifications (enquiries, visits, messages, reviews). */
  inbox: () => request<{ items: InboxNotification[]; unread: number; next: number | null }>("GET", "/api/notifications"),
  markInboxRead: (ids: string[]) => request<{ ok: true }>("POST", "/api/notifications", { ids }),
  createProperty: (input: PropertyInput, publish: boolean) =>
    request<EditableProperty>("POST", "/api/properties", { input, publish }),
  editable: (id: string) => request<EditableProperty>("GET", `/api/properties/${enc(id)}/edit`),
  updateProperty: (id: string, input: PropertyInput) =>
    request<EditableProperty>("PATCH", `/api/properties/${enc(id)}`, { input }),
  deleteProperty: (id: string) => request<{ ok: true }>("DELETE", `/api/properties/${enc(id)}`),
  listingAction: (id: string, action: ListingAction) =>
    request<EditableProperty>("POST", `/api/properties/${enc(id)}/actions`, { action }),
  stats: (id: string) => request<PropertyStats>("GET", `/api/properties/${enc(id)}/stats`),
  /** Uploads straight to storage (Cloudflare R2) when possible, else via the API. */
  uploadPhoto: async (file: File): Promise<UploadedPhoto> => {
    const ticket = await request<UploadTicket>("POST", "/api/uploads/presign", { contentType: file.type, size: file.size });
    if (ticket.mode === "direct") {
      const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file }).catch(() => null);
      if (!res?.ok) throw new ApiError(res?.status ?? 0, "upload_failed", "Photo upload failed. Check your connection and try again.", null);
      return { url: ticket.url, path: ticket.path };
    }
    const form = new FormData();
    form.append("file", file);
    return request<UploadedPhoto>("POST", "/api/uploads", form);
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e && typeof e === "object" && "code" in e) return firebaseErrorMessage(String((e as { code: string }).code));
  return e instanceof Error ? e.message : "Something went wrong.";
}

function firebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/account-exists-with-different-credential": "This email is already used by another EasyStay account.",
    "auth/unauthorized-domain": "Sign-in isn't allowed on this domain yet. Add it under Firebase Authentication → Settings → Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return map[code] ?? "Sign-in failed. Please try again.";
}
