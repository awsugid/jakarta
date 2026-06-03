// =============================================================================
// Shared API types — mirrors jakarta-backend Rust Worker responses.
// =============================================================================

/** A single application form returned by GET /api/forms or /api/forms/:kind */
export interface FormInfo {
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  survey_id: string;
  is_active: boolean;
  opens_at: string | null;
  closes_at: string | null;
  editable_until: string | null;
}

/** Form + computed policy status returned by GET /api/forms/:kind/:slug */
export interface FormStatus {
  form: FormInfo;
  status: "open" | "closed" | "not_yet_open" | "archived";
}

/** Result of GET /api/applications/:kind/:slug (user's existing application) */
export interface DiscoveryResult {
  exists: boolean;
  response_id: string | null;
  finished: boolean | null;
  submitted_email: string | null;
  linkedin_url: string | null;
  editable: boolean;
}

/** Result of POST /api/applications/:kind/:slug/validate */
export interface ValidationResult {
  ok: boolean;
  code: string | null;
  message: string | null;
}

/** Result of POST /api/applications/:kind/:slug/link */
export interface FormLink {
  url: string;
  editable: boolean;
}

/** Authenticated user shape (returned by Google Sign-In, stored in AuthContext). */
export interface AuthUser {
  email: string;
  name?: string;
  picture?: string;
}

/** A single entry in the user's applications summary. */
export interface UserApplicationSummary {
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  response_id: string;
  finished: boolean;
  editable: boolean;
  submitted_at: string;
}

/** Form metadata in the response-detail payload. */
export interface ResponseFormInfo {
  kind: string;
  slug: string;
  title: string;
}

/** The FormBricks response portion in the response-detail payload. */
export interface ApplicationResponse {
  id: string;
  finished: boolean;
  submitted_at: string;
  data: Record<string, any>;
}

/** Full response detail returned by GET .../response. */
export interface ApplicationResponseDetail {
  form: ResponseFormInfo;
  response: ApplicationResponse;
}

/** A single question entry in the form schema. */
export interface FormSchemaQuestion {
  label: string;
  type: string; // e.g. "openText", "fileUpload", "multipleChoiceSingle", "multipleChoiceMulti"
}

/** Question labels schema returned by GET /api/forms/:kind/:slug/schema */
export interface FormSchema {
  questions: Record<string, FormSchemaQuestion>;
}
