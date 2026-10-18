import React, { useEffect, useState } from "react";
import {
  fetchProfilesLookup,
  type Profile,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profiles-api";
import { Button } from "@/components/ui/button";
import {
  User,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PersonItem, PeopleGroup } from "@/lib/types";

export type { PersonItem, PeopleGroup };

export interface PeopleListProps {
  groups: PeopleGroup[];
  preferContentTitle?: boolean;
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

/** Resolve the title from event content or the published profile. */
function getDisplayTitle(
  person: PersonItem,
  profile?: Profile,
  preferContentTitle = false
): string | undefined {
  const contentTitle = (person.fallbackTitle ?? person.role)?.trim();
  const publishedTitle = profile?.title?.trim();

  return preferContentTitle
    ? contentTitle || publishedTitle || undefined
    : publishedTitle || contentTitle || undefined;
}


function safeLinks(person: PersonItem, profile?: Profile): ProfileLink[] {
  const source =
    profile?.links && Array.isArray(profile.links) && profile.links.length > 0
      ? profile.links
      : (person.fallbackLinks as ProfileLink[] | undefined) ?? [];

  return source.filter(
    (link): link is ProfileLink =>
      Boolean(link?.url?.trim()) && LINK_META[link?.kind as ProfileLinkKind] != null
  );
}




const SOCIAL_ROW_CLASSES =
  "flex items-center justify-center flex-wrap gap-2 w-full";

export const PeopleList: React.FC<PeopleListProps> = ({ groups, preferContentTitle = false }) => {
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const allUsernames = groups
      .flatMap((g) => g.people)
      .map((p) => p.username || p.email || "")
      .filter(Boolean);

    if (allUsernames.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProfilesLookup(allUsernames)
      .then((profiles) => {
        if (!isMounted) return;
        const map: Record<string, Profile> = {};
        for (const p of profiles) {
          if (p.username) {
            map[p.username.trim().toLowerCase()] = p;
          }
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

  const handleImageError = (userKey: string) => {
    setFailedImages((prev) => ({ ...prev, [userKey]: true }));
  };

  const hasPeople = groups.some((g) => g.people && g.people.length > 0);
  if (!hasPeople) {
    return null;
  }

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
    <div className="space-y-12">
      {groups.map((group, gIdx) => (
        <PeopleGroupCarousel
          key={group.label || gIdx}
          group={group}
          profilesMap={profilesMap}
          failedImages={failedImages}
          handleImageError={handleImageError}
          preferContentTitle={preferContentTitle}
        />
      ))}
    </div>
  );
};

interface PeopleGroupCarouselProps {
  group: PeopleGroup;
  profilesMap: Record<string, Profile>;
  failedImages: Record<string, boolean>;
  handleImageError: (key: string) => void;
  preferContentTitle?: boolean;
}

function PeopleGroupCarousel({
  group,
  profilesMap,
  failedImages,
  handleImageError,
  preferContentTitle = false,
}: PeopleGroupCarouselProps) {
  const [cardsPerView, setCardsPerView] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = React.useRef<number | null>(null);

  useEffect(() => {
    const updateCardsPerView = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 640) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  const totalPeople = group.people.length;
  const maxIndex = Math.max(0, totalPeople - cardsPerView);

  // Auto-advance interval (4 seconds)
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex]);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="space-y-4">
      {/* Group Header with Title, Count & Controls */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <span>{group.label}</span>
          <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
            {group.people.length} members
          </span>
        </h3>

        {totalPeople > cardsPerView && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePrev}
              aria-label={`Previous in ${group.label}`}
              className="h-8 w-8 rounded-full border-border bg-card shadow-xs hover:bg-accent cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleNext}
              aria-label={`Next in ${group.label}`}
              className="h-8 w-8 rounded-full border-border bg-card shadow-xs hover:bg-accent cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div
        className="relative select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="overflow-hidden -mx-2 sm:-mx-3 py-2">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
            }}
          >
            {group.people.map((person, pIdx) => {
              const userKey = (person.username || person.email || "")
                .trim()
                .toLowerCase();
              const profile = userKey ? profilesMap[userKey] : undefined;
              const displayName = getDisplayName(person, profile);
              const displayTitle = getDisplayTitle(person, profile, preferContentTitle);
              const pictureUrl = profile?.picture;
              const imageFailed = failedImages[userKey];
              const links = safeLinks(person, profile);

              return (
                <div
                  key={`${userKey || pIdx}-${pIdx}`}
                  className="shrink-0 px-2 sm:px-3 w-full sm:w-1/2 lg:w-1/3"
                >
                  <div className="h-full group relative flex flex-col items-center text-center p-6 pt-8 rounded-2xl bg-linear-to-b from-card to-card/60 border border-border/70 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/5">
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
                          onError={() => handleImageError(userKey)}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 rounded-full border-2 border-background object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-muted/70 border-2 border-background flex items-center justify-center text-muted-foreground shadow-inner">
                          <User className="w-12 h-12 text-muted-foreground/70" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="w-full py-2 px-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-bold text-sm sm:text-base truncate mb-2.5 shadow-inner">
                      {displayName}
                    </div>

                    {/* Title pill */}
                    {displayTitle && (
                      <div className="max-w-full py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold text-xs uppercase tracking-wider truncate mb-4">
                        {displayTitle}
                      </div>
                    )}

                    {/* Social/external links */}
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Slide Indicator Dots */}
        {totalPeople > cardsPerView && (
          <div className="flex justify-center items-center gap-1.5 pt-4">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? "w-7 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PeopleList;
