// =============================================================================
// Backend API client — typed fetch helpers for jakarta-backend Worker.
// =============================================================================

import type {
  FormInfo,
  FormStatus,
  DiscoveryResult,
  ValidationResult,
  FormLink,
  UserApplicationSummary,
  ApplicationResponseDetail,
  FormSchema,
  PretixEventStats,
  UserPretixOrdersResponse,
  AdminMe,
  AdminFormSummary,
  AdminFormStatusUpdate,
  AdminFormbricksResponseList,
  AdminFormbricksResponseDetail,
  CommunityStatistics,
  LinkPageProfile,
  LinkItem,
  LinksResponse,
  LinkPageUpdate,
  LinkItemCreate,
  LinkItemUpdate,
  SponsorPackagesResponse,
  SponsorPackageBatchUpdate,
  SponsorPackageCreate,
  SponsorPackageGroupCreate,
  SponsorTierCreate,
  SponsorTierBatchUpdate,
  SponsorSettingsUpdate,
  EventSponsor,
  EventSponsorCreate,
  EventSponsorUpdate,
  EventSponsorOrderItem,
  EventSponsorsResponse,
  EventSpeaker,
  EventSpeakerCreate,
  EventSpeakerUpdate,
  EventSpeakerOrderItem,
  EventSpeakersResponse,
  AdminUserSearchResult,
  AdminUserSearchResponse,
  EnrichedSpeaker,
  EnrichedSession,
  SessionizeDataResponse,
  EventScheduleItem,
  CreateScheduleItem,
  UpdateScheduleItem,
  ScheduleOrderItem,
  SyncSessionizeRequest,
  SyncSessionizeResponse,
  EventScheduleResponse,
  SyncSessionizeSpeakersRequest,
  SyncSpeakersResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base URL of the backend Worker. Configure via PUBLIC_BACKEND_API_URL env. */
export function getBaseUrl(): string {
  // Vite/Astro replaces import.meta.env.PUBLIC_* at build time.
  // If not set the result will be the literal "undefined" string, so guard.
  const raw: string | undefined = import.meta.env.PUBLIC_BACKEND_API_URL;
  if (raw && raw !== "undefined") return raw.replace(/\/+$/, "");
  return "";
}

export function getApiBaseUrl(): string {
  return getBaseUrl();
}

/** Get stored Google ID token (set by AuthProvider). */
function getIdToken(): string | null {
  try {
    return localStorage.getItem("g_id_token");
  } catch {
    return null;
  }
}

/** Build headers for an authenticated request. */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getIdToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    if (token.startsWith("dummy.")) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.email) {
          headers["X-Debug-User-Email"] = payload.email;
        }
      } catch {
        /* ignore */
      }
    }
  }

  const debugEmail = import.meta.env.DEV
    ? import.meta.env.PUBLIC_DEBUG_USER_EMAIL
    : undefined;
  if (debugEmail && !headers["X-Debug-User-Email"]) {
    headers["X-Debug-User-Email"] = debugEmail;
  }

  return headers;
}

/** Lightweight fetch wrapper that prepends base URL and parses JSON errors. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const res = await fetch(url, init);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    const status = res.status;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) message = errBody.error.message;
    } catch {
      /* use default message */
    }
    if (status === 401) {
      try {
        localStorage.removeItem("g_id_token");
        localStorage.removeItem("g_admin_cache");
      } catch {
        /* storage unavailable */
      }
      try {
        sessionStorage.removeItem("g_id_token");
        sessionStorage.removeItem("g_admin_cache");
      } catch {
        /* storage unavailable */
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth-state-change", { detail: null })
        );
      }
    }
    const error = new Error(message) as any;
    error.status = status;
    throw error;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/** GET /api/forms[?kind=volunteer|speaker] — list active forms. */
export async function fetchForms(kind?: string): Promise<FormInfo[]> {
  let path = "/api/forms";
  if (kind) path += `?kind=${encodeURIComponent(kind)}`;
  return apiFetch<FormInfo[]>(path);
}

/** GET /api/forms/:kind/:slug — single form with policy status. */
export async function fetchFormStatus(
  kind: string,
  slug: string,
): Promise<FormStatus> {
  return apiFetch<FormStatus>(
    `/api/forms/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`,
  );
}

/** GET /api/applications/:kind/:slug — discover user's existing application. */
export async function fetchDiscovery(
  kind: string,
  slug: string,
): Promise<DiscoveryResult> {
  return apiFetch<DiscoveryResult>(
    `/api/applications/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`,
    { headers: authHeaders() },
  );
}

/** POST /api/applications/:kind/:slug/validate — check duplicate LinkedIn. */
export async function fetchValidate(
  kind: string,
  slug: string,
  linkedinUrl: string,
): Promise<ValidationResult> {
  return apiFetch<ValidationResult>(
    `/api/applications/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/validate`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ linkedin_url: linkedinUrl }),
    },
  );
}

/** POST /api/applications/:kind/:slug/link — get FormBricks form link. */
export async function fetchFormLink(
  kind: string,
  slug: string,
  mode?: "edit",
): Promise<FormLink> {
  let path = `/api/applications/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/link`;
  if (mode) {
    path += `?mode=${mode}`;
  }
  return apiFetch<FormLink>(path, {
    method: "POST",
    headers: authHeaders(),
  });
}

/** GET /api/applications/summary — list user's applications. */
export async function fetchApplicationsSummary(): Promise<
  UserApplicationSummary[]
> {
  return apiFetch<UserApplicationSummary[]>("/api/applications/summary", {
    headers: authHeaders(),
  });
}

/** GET /api/applications/:kind/:slug/response — fetch full response answers. */
export async function fetchApplicationResponse(
  kind: string,
  slug: string,
): Promise<ApplicationResponseDetail> {
  return apiFetch<ApplicationResponseDetail>(
    `/api/applications/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/response`,
    { headers: authHeaders() },
  );
}

/**
 * Fetch question labels for a form.
 * GET /api/forms/:kind/:slug/schema
 */
export async function fetchFormSchema(
  kind: string,
  slug: string,
): Promise<FormSchema> {
  return apiFetch<FormSchema>(
    `/api/forms/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/schema`,
  );
}

/** GET /api/events/:siteSlug/pretix-stats — public aggregate event statistics. */
export async function fetchPretixEventStats(
  siteSlug: string,
  organizerSlug: string,
  eventSlug: string,
  checkinListId: string,
  subeventId?: string | null,
): Promise<PretixEventStats> {
  const params = new URLSearchParams({
    organizer_slug: organizerSlug,
    event_slug: eventSlug,
    checkin_list_id: checkinListId,
  });
  if (subeventId) params.set("subevent_id", subeventId);

  return apiFetch<PretixEventStats>(
    `/api/events/${encodeURIComponent(siteSlug)}/pretix-stats?${params}`,
  );
}

/** GET /api/pretix/me/orders — current user's Pretix order history. */
export async function fetchUserPretixOrders(
  params?: { limit?: number; offset?: number; status?: "all" | "paid" | "canceled" },
): Promise<UserPretixOrdersResponse> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<UserPretixOrdersResponse>(`/api/pretix/me/orders${suffix}`, {
    headers: authHeaders(),
  });
}

/** GET /api/admin/me — current admin identity (403 if not admin). */
export async function fetchAdminMe(): Promise<AdminMe> {
  return apiFetch<AdminMe>("/api/admin/me", { headers: authHeaders() });
}

/** GET /api/admin/forms — list manageable Formbricks-backed forms. */
export async function fetchAdminForms(): Promise<AdminFormSummary[]> {
  return apiFetch<AdminFormSummary[]>("/api/admin/forms", {
    headers: authHeaders(),
  });
}

/** PUT /api/admin/forms/:kind/:slug — update form active status (open/closed). */
export async function updateAdminFormStatus(
  kind: string,
  slug: string,
  input: AdminFormStatusUpdate,
): Promise<AdminFormSummary> {
  return apiFetch<AdminFormSummary>(
    `/api/admin/forms/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** GET /api/admin/formbricks/responses — paginated responses for a survey. */
export interface AdminFormbricksResponsesParams {
  limit?: number;
  offset?: number;
  finished?: "all" | "true" | "false";
  /** Single exact tag label filter (legacy callers). */
  tag?: string;
  /** Exact tag labels with OR semantics; serialized as repeated tag= params. */
  tags?: string[];
  /** true = only responses with no tags; must not be combined with tag/tags. */
  untagged?: boolean;
}

/** Pure query builder so tag serialization stays testable without network. */
export function buildAdminResponsesQuery(
  surveyId: string,
  params?: AdminFormbricksResponsesParams,
): string {
  const qs = new URLSearchParams({ surveyId });
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.finished) qs.set("finished", params.finished);
  if (params?.tag) qs.set("tag", params.tag);
  for (const tag of params?.tags ?? []) {
    if (tag) qs.append("tag", tag);
  }
  if (params?.untagged) qs.set("untagged", "true");
  return qs.toString();
}

export async function fetchAdminFormbricksResponses(
  surveyId: string,
  params?: AdminFormbricksResponsesParams,
): Promise<AdminFormbricksResponseList> {
  return apiFetch<AdminFormbricksResponseList>(
    `/api/admin/formbricks/responses?${buildAdminResponsesQuery(surveyId, params)}`,
    { headers: authHeaders() },
  );
}

/** GET /api/admin/formbricks/responses/:responseId — full answer detail. */
export async function fetchAdminFormbricksResponseDetail(
  responseId: string,
  surveyId: string,
): Promise<AdminFormbricksResponseDetail> {
  const qs = new URLSearchParams({ surveyId });
  return apiFetch<AdminFormbricksResponseDetail>(
    `/api/admin/formbricks/responses/${encodeURIComponent(responseId)}?${qs}`,
    { headers: authHeaders() },
  );
}

/** GET /api/admin/formbricks/tags — distinct assigned tag labels in a survey. */
export async function fetchAdminFormbricksTags(
  surveyId: string,
): Promise<string[]> {
  const qs = new URLSearchParams({ surveyId });
  return apiFetch<string[]>(`/api/admin/formbricks/tags?${qs}`, {
    headers: authHeaders(),
  });
}

/** PUT /api/admin/formbricks/responses/:responseId/tags — atomically replace the tag set. */
export async function updateAdminFormbricksResponseTags(
  responseId: string,
  surveyId: string,
  tags: string[],
): Promise<{ tags: string[] }> {
  const qs = new URLSearchParams({ surveyId });
  return apiFetch<{ tags: string[] }>(
    `/api/admin/formbricks/responses/${encodeURIComponent(responseId)}/tags?${qs}`,
    { method: "PUT", headers: authHeaders(), body: JSON.stringify({ tags }) },
  );
}

/** GET /api/community/statistics — aggregate community growth + demographics. */
export async function fetchCommunityStatistics(): Promise<CommunityStatistics> {
  return apiFetch<CommunityStatistics>("/api/community/statistics");
}

/** GET /api/links — public Linktree page (profile + enabled items). */
export async function fetchPublicLinks(): Promise<LinksResponse> {
  return apiFetch<LinksResponse>("/api/links");
}

/** GET /api/admin/links — full Linktree config (all items). */
export async function fetchAdminLinks(): Promise<LinksResponse> {
  return apiFetch<LinksResponse>("/api/admin/links", { headers: authHeaders() });
}

/** PUT /api/admin/links/page — update profile. */
export async function updateLinkPage(input: LinkPageUpdate): Promise<LinkPageProfile> {
  return apiFetch<LinkPageProfile>("/api/admin/links/page", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
}

/** POST /api/admin/links/items — create link. */
export async function createLink(input: LinkItemCreate): Promise<LinkItem> {
  return apiFetch<LinkItem>("/api/admin/links/items", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
}

/** PUT /api/admin/links/items/:id — update link. */
export async function updateLink(id: string, input: LinkItemUpdate): Promise<LinkItem> {
  return apiFetch<LinkItem>(`/api/admin/links/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
}

/** DELETE /api/admin/links/items/:id — remove link. */
export async function deleteLink(id: string): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/links/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) message = errBody.error.message;
    } catch { /* ignore */ }
    const error = new Error(message) as any;
    error.status = res.status;
    throw error;
  }
}

/** PUT /api/admin/links/order — reorder all links. Returns full refreshed set. */
export async function reorderLinks(ids: string[]): Promise<LinksResponse> {
  return apiFetch<LinksResponse>("/api/admin/links/order", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
}

/** GET /api/events/:eventSlug/sponsor-packages — public listing incl. locked rows. */
export async function fetchSponsorPackages(
  eventSlug: string,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/events/${encodeURIComponent(eventSlug)}/sponsor-packages`,
  );
}

/** PUT /api/admin/events/:eventSlug/sponsor-packages — batch price/unlock update. */
export async function updateAdminSponsorPackages(
  eventSlug: string,
  input: SponsorPackageBatchUpdate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-packages`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** POST /api/admin/events/:eventSlug/sponsor-packages — create a package in a group. */
export async function createSponsorPackage(
  eventSlug: string,
  input: SponsorPackageCreate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-packages`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** POST /api/admin/events/:eventSlug/sponsor-groups — create a package group. */
export async function createSponsorPackageGroup(
  eventSlug: string,
  input: SponsorPackageGroupCreate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-groups`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/sponsor-packages/:packageId — remove a package. Returns refreshed set. */
export async function deleteSponsorPackage(
  eventSlug: string,
  packageId: string,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-packages/${encodeURIComponent(packageId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/sponsor-groups/:groupId — remove a group. Returns refreshed set. */
export async function deleteSponsorPackageGroup(
  eventSlug: string,
  groupId: string,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-groups/${encodeURIComponent(groupId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** POST /api/admin/events/:eventSlug/sponsor-tiers — create a tier. Returns refreshed set. */
export async function createSponsorTier(
  eventSlug: string,
  input: SponsorTierCreate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-tiers`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/sponsor-tiers — batch tier update. Returns refreshed set. */
export async function updateSponsorTiers(
  eventSlug: string,
  input: SponsorTierBatchUpdate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-tiers`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/sponsor-tiers/:tierId — remove a tier. Returns refreshed set. */
export async function deleteSponsorTier(
  eventSlug: string,
  tierId: string,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-tiers/${encodeURIComponent(tierId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/sponsor-settings — update sponsor settings (exchange rate). */
export async function updateSponsorSettings(
  eventSlug: string,
  input: SponsorSettingsUpdate,
): Promise<SponsorPackagesResponse> {
  return apiFetch<SponsorPackagesResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-settings`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** POST /api/admin/events/:eventSlug/sponsor-mockup — upload placement mockup visual asset (admin-only). */
export async function uploadSponsorMockup(
  eventSlug: string,
  file: File,
  path?: string,
): Promise<{ url: string; key: string }> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Unsupported file type (${file.type || "unknown"}). Allowed formats: JPEG, PNG, WebP.`
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size exceeds 5 MB limit (Selected file is ${sizeMb} MB). Please compress or choose a smaller image.`
    );
  }
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch<{ url: string; key: string }>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-mockup${query}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": file.type,
      },
      body: file,
    },
  );
}

// ---------------------------------------------------------------------------
// Event Sponsors (Directory / Partners) API
// ---------------------------------------------------------------------------

/** GET /api/events/:eventSlug/sponsors — public list of active event sponsors. */
export async function fetchPublicSponsors(
  eventSlug: string,
): Promise<EventSponsorsResponse> {
  return apiFetch<EventSponsorsResponse>(
    `/api/events/${encodeURIComponent(eventSlug)}/sponsors`,
  );
}

/** GET /api/admin/events/:eventSlug/sponsors — admin list of all event sponsors (active + inactive). */
export async function fetchAdminSponsors(
  eventSlug: string,
): Promise<EventSponsorsResponse> {
  return apiFetch<EventSponsorsResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsors`,
    {
      headers: authHeaders(),
    },
  );
}

/** POST /api/admin/events/:eventSlug/sponsors — create a sponsor. */
export async function createAdminSponsor(
  eventSlug: string,
  input: EventSponsorCreate,
): Promise<EventSponsor> {
  return apiFetch<EventSponsor>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsors`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/sponsors/:sponsorId — update a sponsor. */
export async function updateAdminSponsor(
  eventSlug: string,
  sponsorId: string,
  input: EventSponsorUpdate,
): Promise<EventSponsor> {
  return apiFetch<EventSponsor>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsors/${encodeURIComponent(sponsorId)}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/sponsors/:sponsorId — delete a sponsor. Returns refreshed list. */
export async function deleteAdminSponsor(
  eventSlug: string,
  sponsorId: string,
): Promise<EventSponsorsResponse> {
  return apiFetch<EventSponsorsResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsors/${encodeURIComponent(sponsorId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/sponsors/order — reorder sponsors. */
export async function reorderAdminSponsors(
  eventSlug: string,
  items: EventSponsorOrderItem[],
): Promise<EventSponsorsResponse> {
  return apiFetch<EventSponsorsResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsors/order`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ items }),
    },
  );
}

// ---------------------------------------------------------------------------
// Event Speakers API
// ---------------------------------------------------------------------------

/** GET /api/events/:eventSlug/speakers — fetch active speakers for public showcase */
export async function fetchPublicSpeakers(
  eventSlug: string,
): Promise<EventSpeakersResponse> {
  return apiFetch<EventSpeakersResponse>(
    `/api/events/${encodeURIComponent(eventSlug)}/speakers`,
  );
}

/** GET /api/admin/events/:eventSlug/speakers or /api/admin/speakers — fetch speakers for admin */
export async function fetchAdminSpeakers(
  eventSlug?: string,
): Promise<EventSpeakersResponse> {
  const endpoint =
    eventSlug && eventSlug !== "ALL"
      ? `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers`
      : `/api/admin/speakers`;
  return apiFetch<EventSpeakersResponse>(endpoint, { headers: authHeaders() });
}

/** POST /api/admin/events/:eventSlug/speakers — create a speaker */
export async function createAdminSpeaker(
  eventSlug: string,
  input: EventSpeakerCreate,
): Promise<EventSpeaker> {
  return apiFetch<EventSpeaker>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/speakers/:speakerId — update a speaker */
export async function updateAdminSpeaker(
  eventSlug: string,
  speakerId: string,
  input: EventSpeakerUpdate,
): Promise<EventSpeaker> {
  return apiFetch<EventSpeaker>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers/${encodeURIComponent(speakerId)}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/speakers/:speakerId — delete a speaker */
export async function deleteAdminSpeaker(
  eventSlug: string,
  speakerId: string,
): Promise<EventSpeakersResponse> {
  return apiFetch<EventSpeakersResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers/${encodeURIComponent(speakerId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/speakers/order — reorder speakers */
export async function reorderAdminSpeakers(
  eventSlug: string,
  items: EventSpeakerOrderItem[],
): Promise<EventSpeakersResponse> {
  return apiFetch<EventSpeakersResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers/order`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ items }),
    },
  );
}

/** GET /api/admin/users/search?q=... — search registered community users for speaker autofill (admin-only). */
export async function searchAdminUsers(
  query?: string,
): Promise<AdminUserSearchResponse> {
  const qs = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  return apiFetch<AdminUserSearchResponse>(`/api/admin/users/search${qs}`, {
    headers: authHeaders(),
  });
}

/** POST /api/admin/events/:eventSlug/speakers/upload — upload speaker photo or topic banner (admin-only). */
export async function uploadSpeakerAsset(
  eventSlug: string,
  file: File,
  type: "photo" | "topic" = "photo",
): Promise<{ url: string; key: string }> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Unsupported file type (${file.type || "unknown"}). Allowed formats: JPEG, PNG, WebP.`
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size exceeds 5 MB limit (Selected file is ${sizeMb} MB). Please compress or choose a smaller image.`
    );
  }

  try {
    return await apiFetch<{ url: string; key: string }>(
      `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers/upload?type=${encodeURIComponent(type)}`,
      {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": file.type,
        },
        body: file,
      },
    );
  } catch (err: any) {
    // Graceful fallback to sponsor-mockup endpoint if speakers/upload is not yet deployed on worker
    if (err?.status === 404) {
      const folder = type === "topic" ? `${eventSlug}/topics` : `${eventSlug}/speakers`;
      return await apiFetch<{ url: string; key: string }>(
        `/api/admin/events/${encodeURIComponent(eventSlug)}/sponsor-mockup?path=${encodeURIComponent(folder)}`,
        {
          method: "POST",
          headers: {
            ...authHeaders(),
            "Content-Type": file.type,
          },
          body: file,
        },
      );
    }
    throw err;
  }
}

/** POST /api/admin/events/:eventSlug/speakers/sync-sessionize — sync speakers from Sessionize (admin-only) */
export async function syncSessionizeSpeakers(
  eventSlug: string,
  body?: SyncSessionizeSpeakersRequest,
): Promise<SyncSpeakersResponse> {
  return apiFetch<SyncSpeakersResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/speakers/sync-sessionize`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    },
  );
}

// ---------------------------------------------------------------------------
// Sessionize Integration API
// ---------------------------------------------------------------------------

export interface SessionizeQueryParams {
  q?: string;
  room?: string;
  jobTitle?: string;
  company?: string;
  fresh?: boolean;
}

function buildSessionizeQuery(params?: SessionizeQueryParams): string {
  if (!params) return "";
  const qp = new URLSearchParams();
  if (params.q) qp.set("q", params.q);
  if (params.room) qp.set("room", params.room);
  if (params.jobTitle) qp.set("jobTitle", params.jobTitle);
  if (params.company) qp.set("company", params.company);
  if (params.fresh) qp.set("fresh", "true");
  const s = qp.toString();
  return s ? `?${s}` : "";
}

/** GET /api/sessionize/speakers — cached list of enriched speakers */
export async function fetchSessionizeSpeakers(
  params?: SessionizeQueryParams,
): Promise<{ speakers: EnrichedSpeaker[] }> {
  return apiFetch<{ speakers: EnrichedSpeaker[] }>(
    `/api/sessionize/speakers${buildSessionizeQuery(params)}`,
  );
}

/** GET /api/sessionize/sessions — cached list of enriched sessions */
export async function fetchSessionizeSessions(
  params?: SessionizeQueryParams,
): Promise<{ sessions: EnrichedSession[] }> {
  return apiFetch<{ sessions: EnrichedSession[] }>(
    `/api/sessionize/sessions${buildSessionizeQuery(params)}`,
  );
}

/** GET /api/sessionize/data — full enriched Sessionize dataset with rooms, metadata, and speakers */
export async function fetchSessionizeData(
  params?: SessionizeQueryParams,
): Promise<SessionizeDataResponse> {
  return apiFetch<SessionizeDataResponse>(
    `/api/sessionize/data${buildSessionizeQuery(params)}`,
  );
}

// ---------------------------------------------------------------------------
// Event Schedule API
// ---------------------------------------------------------------------------

/** GET /api/events/:eventSlug/schedule — public active schedule */
export async function fetchPublicSchedule(
  eventSlug: string,
): Promise<EventScheduleResponse> {
  return apiFetch<EventScheduleResponse>(
    `/api/events/${encodeURIComponent(eventSlug)}/schedule`,
  );
}

/** GET /api/admin/events/:eventSlug/schedule — admin all schedule items */
export async function fetchAdminSchedule(
  eventSlug: string,
): Promise<EventScheduleResponse> {
  return apiFetch<EventScheduleResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule`,
    {
      headers: authHeaders(),
    },
  );
}

/** POST /api/admin/events/:eventSlug/schedule — create schedule item */
export async function createAdminScheduleItem(
  eventSlug: string,
  body: CreateScheduleItem,
): Promise<EventScheduleItem> {
  return apiFetch<EventScheduleItem>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/schedule/:itemId — update schedule item */
export async function updateAdminScheduleItem(
  eventSlug: string,
  itemId: string,
  body: UpdateScheduleItem,
): Promise<EventScheduleItem> {
  return apiFetch<EventScheduleItem>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule/${encodeURIComponent(itemId)}`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

/** DELETE /api/admin/events/:eventSlug/schedule/:itemId — delete schedule item */
export async function deleteAdminScheduleItem(
  eventSlug: string,
  itemId: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

/** PUT /api/admin/events/:eventSlug/schedule/order — batch reorder schedule items */
export async function reorderAdminSchedule(
  eventSlug: string,
  items: ScheduleOrderItem[],
): Promise<EventScheduleResponse> {
  return apiFetch<EventScheduleResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule/order`,
    {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    },
  );
}

/** POST /api/admin/events/:eventSlug/schedule/sync-sessionize — sync from Sessionize */
export async function syncSessionizeSchedule(
  eventSlug: string,
  body?: SyncSessionizeRequest,
): Promise<SyncSessionizeResponse> {
  return apiFetch<SyncSessionizeResponse>(
    `/api/admin/events/${encodeURIComponent(eventSlug)}/schedule/sync-sessionize`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    },
  );
}




