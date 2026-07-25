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

/** User's own Pretix order summary (camelCase from backend serde rename_all). */
export interface UserPretixOrderSummary {
  orderCode: string;
  eventSlug: string;
  eventName: string;
  eventDate: string | null;
  orderDatetime: string | null;
  status: string;
  attendeeCount: number;
  checkedInCount: number | null;
  total: string | null;
  currency: string | null;
  pretixCustomerPortalUrl: string | null;
}

/** Paginated wrapper for GET /api/pretix/me/orders */
export interface UserPretixOrdersResponse {
  orders: UserPretixOrderSummary[];
  total: number | null;
  limit: number;
  offset: number;
}

/** Pretix event statistics returned by GET /api/events/:slug/pretix-stats */
export interface PretixEventStats {
  site_slug: string;
  pretix: {
    organizer_slug: string;
    event_slug: string;
    checkin_list_id: string;
    subevent_id: string | null;
  };
  registered_count: number;
  checked_in_count: number;
  attendance_rate: number | null;
  last_refreshed_at: string;
  stale: boolean;
}

/** Admin identity returned by GET /api/admin/me */
export interface AdminMe {
  email: string;
  name?: string;
  picture?: string;
  is_admin: true;
}

/** Admin form list entry from GET /api/admin/forms */
export interface AdminFormSummary {
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  survey_id: string;
  is_active: boolean;
  response_count: number | null;
}

/** Response summary in admin Formbricks listings. */
export interface AdminFormbricksResponseSummary {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  updated_at: string | null;
  finished: boolean;
  respondent_email: string | null;
  respondent_name: string | null;
  preview_answers: Record<string, string | number | boolean | string[] | null>;
}

/** Paginated list wrapper. */
export interface AdminFormbricksResponseList {
  items: AdminFormbricksResponseSummary[];
  total: number | null;
  limit: number;
  offset: number;
}

/** Single labeled answer in a response detail payload. */
export interface AdminFormbricksAnswer {
  question_id: string;
  label: string;
  type: string;
  value: unknown;
}

/** Full response detail from GET /api/admin/formbricks/responses/:id */
export interface AdminFormbricksResponseDetail {
  id: string;
  survey_id: string;
  submitted_at: string | null;
  updated_at: string | null;
  finished: boolean;
  answers: AdminFormbricksAnswer[];
  metadata: { contact_id?: string };
}

/** A labeled count entry (e.g. top positions, top companies). */
export interface LabelCount {
  label: string;
  count: number;
}

/** Community statistics returned by GET /api/community/statistics. */
export interface CommunityStatistics {
  participantNumOfTheYear: { year: number; total: number }[];
  eventPerYear: { year: number; total: number }[];
  participantGenderDistributionLastYear: { male: number; female: number };
  participantBackgroundDistribution: {
    professional: number;
    student: number;
  };
  participantGenderDistributionThisYear?: { male: number; female: number };
  positionDistributionThisYear?: LabelCount[];
  topCompaniesThisYear?: LabelCount[];
  avgAwsExperienceYears?: number | null;
  awsExperienceDistributionThisYear?: LabelCount[];
  ageDistributionThisYear?: LabelCount[];
}

/** Background variants for the Linktree page. */
export type LinkBackground = "dark" | "gradient" | "mesh";
/** Button style variants for Linktree links. */
export type LinkButtonStyle = "solid" | "outline" | "soft";
/** Allowed icon identifiers (lucide-react mappings on frontend). */
export type LinkIcon =
  | "link" | "github" | "linkedin" | "twitter" | "instagram" | "youtube"
  | "globe" | "mail" | "calendar" | "map-pin" | "users" | "external-link";

/** Singleton Linktree profile. */
export interface LinkPageProfile {
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  background: LinkBackground;
  buttonStyle: LinkButtonStyle;
  updatedAt: string;
}

/** A single link item. */
export interface LinkItem {
  id: string;
  label: string;
  url: string;
  icon: LinkIcon | null;
  isEnabled: boolean;
  displayOrder: number;
}

/** Response envelope for GET /api/links and GET /api/admin/links. */
export interface LinksResponse {
  page: LinkPageProfile;
  items: LinkItem[];
}

/** Body for PUT /api/admin/links/page. */
export interface LinkPageUpdate {
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  background: LinkBackground;
  buttonStyle: LinkButtonStyle;
}

/** Body for POST /api/admin/links/items. */
export interface LinkItemCreate {
  label: string;
  url: string;
  icon: LinkIcon | null;
}

/** Body for PUT /api/admin/links/items/:id. */
export interface LinkItemUpdate {
  label: string;
  url: string;
  icon: LinkIcon | null;
  isEnabled: boolean;
}

/** Body for PUT /api/admin/links/order. */
export interface LinkReorderRequest {
  ids: string[];
}
