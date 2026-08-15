import { apiFetch, authHeaders } from "./api";

export interface Profile {
  normalized_email: string;
  display_name: string;
  title: string;
  links: ProfileLink[];
  picture?: string | null;
  profile_updated_at: string;
}

export interface ProfilesLookupResponse {
  profiles: Profile[];
}

export type ProfileLinkKind =
  | "instagram"
  | "linkedin"
  | "github"
  | "website"
  | "x"
  | "youtube"
  | "other";

export interface ProfileLink {
  kind: ProfileLinkKind;
  url: string;
  label?: string;
}

export interface MyProfile {
  email: string;
  displayName: string | null;
  title: string | null;
  links: ProfileLink[];
  isPublic: boolean;
  picture: string | null;
  profileUpdatedAt: string | null;
}

export interface MyProfileUpdate {
  displayName: string | null;
  title: string | null;
  links: ProfileLink[];
  isPublic: boolean;
}

/** GET /api/profiles/me — current user's editable profile. */
export async function getMyProfile(): Promise<MyProfile> {
  return apiFetch<MyProfile>("/api/profiles/me", { headers: authHeaders() });
}

/** PUT /api/profiles/me — replace editable profile fields. */
export async function updateMyProfile(
  input: MyProfileUpdate,
): Promise<MyProfile> {
  return apiFetch<MyProfile>("/api/profiles/me", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
}

/**
 * Batch fetch profiles for a list of email addresses.
 * Deduplicates emails and chunks requests into batches of max 50 emails.
 */
export async function fetchProfilesLookup(emails: string[]): Promise<Profile[]> {
  const normalizedSet = new Set<string>();
  for (const email of emails) {
    if (!email) continue;
    const trimmed = email.trim().toLowerCase();
    if (trimmed) {
      normalizedSet.add(trimmed);
    }
  }

  const uniqueEmails = Array.from(normalizedSet);
  if (uniqueEmails.length === 0) {
    return [];
  }

  // Chunk into batches of 50 (backend limit)
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    batches.push(uniqueEmails.slice(i, i + BATCH_SIZE));
  }

  const allProfiles: Profile[] = [];

  for (const batch of batches) {
    try {
      const res = await apiFetch<ProfilesLookupResponse>("/api/profiles/lookup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ emails: batch }),
      });
      if (res && Array.isArray(res.profiles)) {
        allProfiles.push(...res.profiles);
      }
    } catch (err) {
      console.error("Error looking up profiles batch:", err);
    }
  }

  return allProfiles;
}
