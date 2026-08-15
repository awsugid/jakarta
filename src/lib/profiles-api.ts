import { apiFetch, authHeaders } from "./api";

export interface Profile {
  username: string;
  normalized_email?: string;
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
  username: string | null;
  displayName: string | null;
  title: string | null;
  links: ProfileLink[];
  isPublic: boolean;
  picture: string | null;
  profileUpdatedAt: string | null;
}

export interface MyProfileUpdate {
  username: string | null;
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

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

/** POST /api/profiles/me/avatar — upload custom avatar image (JPEG, PNG, WebP <= 2MB). */
export async function uploadAvatar(file: File): Promise<MyProfile> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed types: JPEG, PNG, WebP.");
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("File size exceeds 2MB limit.");
  }

  return apiFetch<MyProfile>("/api/profiles/me/avatar", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": file.type,
    },
    body: file,
  });
}

/** DELETE /api/profiles/me/avatar — revert custom avatar to Google profile photo. */
export async function revertAvatarToGoogle(): Promise<MyProfile> {
  return apiFetch<MyProfile>("/api/profiles/me/avatar", {
    method: "DELETE",
    headers: authHeaders(),
  });
}

/**
 * Batch fetch profiles for a list of identifiers (usernames).
 * Deduplicates usernames and chunks requests into batches of max 50 usernames.
 */
export async function fetchProfilesLookup(identifiers: string[]): Promise<Profile[]> {
  const normalizedSet = new Set<string>();
  for (const id of identifiers) {
    if (!id) continue;
    const trimmed = id.trim().toLowerCase();
    if (trimmed) {
      normalizedSet.add(trimmed);
    }
  }

  const uniqueUsernames = Array.from(normalizedSet);
  if (uniqueUsernames.length === 0) {
    return [];
  }

  // Chunk into batches of 50 (backend limit)
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < uniqueUsernames.length; i += BATCH_SIZE) {
    batches.push(uniqueUsernames.slice(i, i + BATCH_SIZE));
  }

  const allProfiles: Profile[] = [];

  for (const batch of batches) {
    try {
      const res = await apiFetch<ProfilesLookupResponse>("/api/profiles/lookup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ usernames: batch }),
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
