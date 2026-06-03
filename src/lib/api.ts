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
function authHeaders(): Record<string, string> {
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
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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
