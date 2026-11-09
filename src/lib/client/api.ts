"use client";

/**
 * Typed client for the EasyStay API. Pages never talk to a database SDK —
 * only to these functions — so the backend can change without UI changes.
 */
import type {
  ContactInfo,
  EditableProperty,
  Me,
  MyRatingListItem,
  MyRatingResponse,
  OwnerListingsResponse,
  OwnerSettingsUpdate,
  ProfileUpdate,
  PropertyDetail,
  PropertyStats,
  RatingInput,
  RatingsResponse,
  ReminderItem,
  SavedItem,
  SearchResponse,
  Suggestion,
  UploadedPhoto,
} from "@/types/api";
import type { ListingAction } from "@/lib/domain/listing";
import { serializeFilters, type SearchFilters } from "@/lib/domain/search";
import type { ContactChannel } from "@/lib/domain/types";
import type { PropertyInput } from "@/lib/domain/validation";
import { firebaseAuth, firebaseConfigured } from "./firebase";

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

  /* account */
  me: () => request<Me>("GET", "/api/me"),
  updateProfile: (body: ProfileUpdate) => request<Me>("PATCH", "/api/me", body),
  enableOwnerTools: () => request<Me>("POST", "/api/me/owner-tools"),
  disableOwnerTools: () => request<Me>("DELETE", "/api/me/owner-tools"),
  updateOwnerSettings: (body: OwnerSettingsUpdate) => request<Me>("PATCH", "/api/me/owner-settings", body),

  /* owner */
  myListings: () => request<OwnerListingsResponse>("GET", "/api/me/listings"),
  notifications: () => request<{ items: ReminderItem[] }>("GET", "/api/me/notifications"),
  createProperty: (input: PropertyInput, publish: boolean) =>
    request<EditableProperty>("POST", "/api/properties", { input, publish }),
  editable: (id: string) => request<EditableProperty>("GET", `/api/properties/${enc(id)}/edit`),
  updateProperty: (id: string, input: PropertyInput) =>
    request<EditableProperty>("PATCH", `/api/properties/${enc(id)}`, { input }),
  deleteProperty: (id: string) => request<{ ok: true }>("DELETE", `/api/properties/${enc(id)}`),
  listingAction: (id: string, action: ListingAction) =>
    request<EditableProperty>("POST", `/api/properties/${enc(id)}/actions`, { action }),
  stats: (id: string) => request<PropertyStats>("GET", `/api/properties/${enc(id)}/stats`),
  uploadPhoto: (file: File) => {
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
    "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
    "auth/invalid-verification-code": "That code is incorrect. Check the SMS and try again.",
    "auth/code-expired": "That code has expired. Request a new one.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/credential-already-in-use": "This mobile number is already linked to another EasyStay account.",
    "auth/account-exists-with-different-credential": "This number is already linked to another EasyStay account.",
    "auth/provider-already-linked": "A mobile number is already verified on this account.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/captcha-check-failed": "Verification failed. Please try again.",
  };
  return map[code] ?? "Sign-in failed. Please try again.";
}
