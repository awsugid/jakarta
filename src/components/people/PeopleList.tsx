import React, { useEffect, useState } from "react";
import {
  fetchProfilesLookup,
  type Profile,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profiles-api";
import {
  User,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";



export interface PersonItem {
  email: string;
  fallbackName?: string;
  /** Transitional title until every roster member has a published profile. */
  fallbackTitle?: string;
  /** @deprecated use `fallbackTitle`; alias kept so current roster pages keep typechecking. */
  role?: string;
}

export interface PeopleGroup {
  label: string;
  people: PersonItem[];
}

export interface PeopleListProps {
  groups: PeopleGroup[];
}

const LINK_META: Record<ProfileLinkKind, { icon: LucideIcon; label: string }> = {
  instagram: { icon: Instagram, label: "Instagram" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  github: { icon: Github, label: "GitHub" },
  website: { icon: Globe, label: "Website" },
  x: { icon: Twitter, label: "X (Twitter)" },
  youtube: { icon: Youtube, label: "YouTube" },
  other: { icon: ExternalLink, label: "Website" },
};

/**
 * Display name fallback chain:
 * published display_name -> transitional fallbackName -> neutral placeholder.
 */
function getDisplayName(person: PersonItem, profile?: Profile): string {
  const publishedName = profile?.display_name?.trim();
  if (publishedName) return publishedName;

  const fallbackName = person.fallbackName?.trim();
  if (fallbackName) return fallbackName;

  return "Community Member";
}

/** Published title -> transitional fallbackTitle/role -> undefined (pill omitted). */
function getDisplayTitle(
  person: PersonItem,
  profile?: Profile
): string | undefined {
  const publishedTitle = profile?.title?.trim();
  if (publishedTitle) return publishedTitle;
  return (person.fallbackTitle ?? person.role)?.trim() || undefined;
}

/** Derives 1-2 uppercase initials from a name string for the avatar fallback. */
function getInitials(name: string): string {
  if (!name || name === "Community Member") return "CM";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function safeLinks(profile?: Profile): ProfileLink[] {
  if (!profile?.links || !Array.isArray(profile.links)) return [];
  return profile.links.filter(
    (link): link is ProfileLink =>
      Boolean(link?.url) && LINK_META[link?.kind as ProfileLinkKind] != null
  );
}

const SOCIAL_ROW_CLASSES =
  "flex items-center justify-center flex-wrap gap-2 w-full";

export const PeopleList: React.FC<PeopleListProps> = ({ groups }) => {
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const allEmails = groups
      .flatMap((g) => g.people)
      .map((p) => p.email)
      .filter(Boolean);

    if (allEmails.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProfilesLookup(allEmails)
      .then((profiles) => {
        if (!isMounted) return;
        const map: Record<string, Profile> = {};
        for (const p of profiles) {
          if (p.normalized_email) {
            map[p.normalized_email.trim().toLowerCase()] = p;
          }
        }
        setProfilesMap(map);
      })
      .catch((err) => {
        console.error("[PeopleList] Failed to fetch profiles lookup:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [groups]);

  const handleImageError = (emailKey: string) => {
    setFailedImages((prev) => ({ ...prev, [emailKey]: true }));
  };

  if (loading) {
    return (
      <div className="space-y-10">
        {groups.map((group, gIdx) => (
          <div key={group.label || gIdx} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(group.people.length > 0 ? group.people : [1, 2, 3]).map(
                (_, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/70 shadow-sm"
                  >
                    <Skeleton className="w-24 h-24 rounded-full mb-4" />
                    <Skeleton className="w-3/4 h-9 rounded-xl mb-2.5" />
                    <Skeleton className="w-1/2 h-7 rounded-lg" />
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map((group, gIdx) => (
        <div key={group.label || gIdx} className="space-y-4">
          <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2 border-b border-border/50 pb-2">
            <span>{group.label}</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {group.people.length}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {group.people.map((person, pIdx) => {
              const emailKey = person.email
                ? person.email.trim().toLowerCase()
                : "";
              const profile = emailKey ? profilesMap[emailKey] : undefined;
              const displayName = getDisplayName(person, profile);
              const displayTitle = getDisplayTitle(person, profile);
              const pictureUrl = profile?.picture;
              const imageFailed = failedImages[emailKey];
              const links = safeLinks(profile);

              return (
                <div
                  key={`${person.email}-${pIdx}`}
                  className="group relative flex flex-col items-center text-center p-6 pt-8 rounded-2xl bg-linear-to-b from-card to-card/60 border border-border/70 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Soft orange corner glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-40 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />

                  {/* Top: centered circular avatar with gradient ring */}
                  <div className="relative mb-4 shrink-0 rounded-full p-[3px] bg-linear-to-br from-primary/70 via-orange-400/40 to-primary/20 shadow-md group-hover:scale-105 transition-transform duration-300">
                    {pictureUrl && !imageFailed ? (
                      <img
                        src={pictureUrl}
                        alt={displayName}
                        onError={() => handleImageError(emailKey)}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full border-2 border-background object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-card border-2 border-background flex items-center justify-center text-foreground font-bold text-xl">
                        {displayName !== "Community Member" ? (
                          getInitials(displayName)
                        ) : (
                          <User className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="w-full py-2 px-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-bold text-sm sm:text-base truncate mb-2.5 shadow-inner">
                    {displayName}
                  </div>

                  {/* Title pill — omitted entirely when no title exists */}
                  {displayTitle && (
                    <div className="max-w-full py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold text-xs uppercase tracking-wider truncate mb-4">
                      {displayTitle}
                    </div>
                  )}

                  {/* Social/external links — only when at least one exists */}
                  {links.length > 0 && (
                    <div
                      className={
                        displayTitle
                          ? `${SOCIAL_ROW_CLASSES} mt-auto`
                          : `${SOCIAL_ROW_CLASSES} mt-4`
                      }
                    >
                      {links.map((link, lIdx) => {
                        const meta = LINK_META[link.kind];
                        const Icon = meta.icon;
                        const label =
                          link.label?.trim() ||
                          (link.kind === "website" || link.kind === "other"
                            ? "Website"
                            : meta.label);
                        const isKnownSocial = link.kind !== "website" && link.kind !== "other";

                        return (
                          <a
                            key={`${link.kind}-${lIdx}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${displayName} — ${label}`}
                            title={label}
                            className={
                              isKnownSocial
                                ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 border border-border/60 text-foreground/80 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                : "inline-flex h-9 items-center justify-center gap-1.5 px-3 rounded-full bg-muted/60 border border-border/60 text-foreground/80 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-colors text-xs font-medium max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            {!isKnownSocial && (
                              <span className="truncate max-w-28">{label}</span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PeopleList;
