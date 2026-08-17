// =============================================================================
// Global Lightweight Validation Helpers & Rules (Zero External Dependencies)
// =============================================================================

export const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Extracts hostname without www prefix from a URL string */
export function urlHost(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Checks if a string is non-empty after trimming */
export function isNonEmpty(value?: string | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

/** Checks valid email format */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/** Checks valid username format (3-30 lowercase letters, numbers, hyphens, underscores) */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim().toLowerCase());
}

/** Checks if URL is valid http/https and optionally matches allowed domain hostnames */
export function isValidUrl(url: string, allowedHosts?: string[]): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  const host = urlHost(trimmed);
  if (!host) return false;
  if (allowedHosts && allowedHosts.length > 0) {
    return allowedHosts.includes(host);
  }
  return true;
}
