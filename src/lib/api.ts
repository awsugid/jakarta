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
  AdminFormbricksResponseList,
  AdminFormbricksResponseDetail,
  CommunityStatistics,
  LinkPageProfile,
  LinkItem,
  LinksResponse,
  LinkPageUpdate,
  LinkItemCreate,
  LinkItemUpdate,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base URL of the backend Worker. Configure via PUBLIC_BACKEND_API_URL env. */
function getBaseUrl(): string {
  // Vite/Astro replaces import.meta.env.PUBLIC_* at build time.
  // If not set the result will be the literal "undefined" string, so guard.
  const raw: string | undefined = import.meta.env.PUBLIC_BACKEND_API_URL;
  if (raw && raw !== "undefined") return raw.replace(/\/+$/, "");
  return "";
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

/** GET /api/admin/formbricks/responses — paginated responses for a survey. */
export async function fetchAdminFormbricksResponses(
  surveyId: string,
  params?: { limit?: number; offset?: number; finished?: "all" | "true" | "false" },
): Promise<AdminFormbricksResponseList> {
  const qs = new URLSearchParams({ surveyId });
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.finished) qs.set("finished", params.finished);
  return apiFetch<AdminFormbricksResponseList>(
    `/api/admin/formbricks/responses?${qs}`,
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
